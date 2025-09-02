import os
from io import BytesIO
from flask import Flask, render_template, request, jsonify
import pandas as pd
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {"xlsx", "xls"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def build_report(df: pd.DataFrame):
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    # Try match likely column names
    col_student = next((c for c in df.columns if c.lower().startswith("student number")), None)
    col_name = next((c for c in df.columns if c.lower().startswith("student name")), None)
    col_module = next((c for c in df.columns if c.lower().startswith("module")), None)
    col_year = next((c for c in df.columns if c.lower() == "year"), None)
    col_week = next((c for c in df.columns if c.lower() == "week"), None)
    col_reason = next((c for c in df.columns if "reason" in c.lower()), None)
    col_risk = next((c for c in df.columns if "risk" in c.lower()), None)
    col_resolved = next((c for c in df.columns if "resolved" in c.lower()), None)

    # Normalize dtypes for JSON
    if col_week and df[col_week].notna().any():
        df[col_week] = df[col_week].astype(str)
    if col_year and df[col_year].notna().any():
        df[col_year] = df[col_year].astype(str)

    total_records = int(len(df))
    unique_students = int(df[col_student].nunique()) if col_student else None

    risk_counts = df[col_risk].value_counts(dropna=False).to_dict() if col_risk else {}
    resolved_counts = df[col_resolved].value_counts(dropna=False).to_dict() if col_resolved else {}

    by_module = {}
    if col_module and col_student:
        by_module = (
            df.groupby(col_module)[col_student]
            .nunique()
            .sort_values(ascending=False)
            .head(15)
            .to_dict()
        )

    by_reason = df[col_reason].value_counts().head(15).to_dict() if col_reason else {}

    week_risk = {}
    if col_week and col_risk:
        pivot = df.pivot_table(
            index=col_week,
            columns=col_risk,
            values=col_student if col_student else df.columns[0],
            aggfunc="count",
            fill_value=0,
        )

        # Sort weeks like Week1, Week2, ... if that pattern exists
        def _week_key(s):
            try:
                # extract first number found
                import re
                nums = s.astype(str).str.extract(r"(\d+)", expand=False)
                return nums.fillna("0").astype(int)
            except Exception:
                return s

        pivot = pivot.sort_index(key=_week_key)
        week_risk = {
            "weeks": list(pivot.index.astype(str)),
            "series": [{"name": str(c), "data": list(pivot[c].astype(int).values)} for c in pivot.columns],
        }

    repeated_students = {}
    if col_student:
        counts = df.groupby(col_student).size().sort_values(ascending=False)
        repeated = counts[counts > 1].head(50)
        if not repeated.empty:
            preview_cols = [c for c in [col_student, col_name, col_module, col_week, col_risk] if c in df.columns]
            preview = df[df[col_student].isin(repeated.index)][preview_cols].copy().head(200)
            repeated_students = {
                "top_counts": repeated.to_dict(),
                "preview_rows": preview.fillna("").astype(str).to_dict(orient="records"),
            }

    sample_rows = df.head(50).fillna("").astype(str).to_dict(orient="records")

    return {
        "total_records": total_records,
        "unique_students": unique_students,
        "risk_counts": risk_counts,
        "resolved_counts": resolved_counts,
        "by_module": by_module,
        "by_reason": by_reason,
        "week_risk": week_risk,
        "repeated_students": repeated_students,
        "sample_rows": sample_rows,
    }

def create_app():
    app = Flask(__name__)

    @app.route("/", methods=["GET"])
    def index():
        return render_template("index.html", report=None, error=None, filename=None)

    @app.route("/upload", methods=["POST"])
    def upload():
        if "file" not in request.files:
            return render_template("index.html", report=None, error="No file part.", filename=None)
        file = request.files["file"]
        if file.filename == "":
            return render_template("index.html", report=None, error="No file selected.", filename=None)
        if not allowed_file(file.filename):
            return render_template("index.html", report=None, error="Please upload an Excel file (.xlsx or .xls).", filename=None)

        filename = secure_filename(file.filename)
        try:
            # Read into memory and parse with pandas
            data = BytesIO(file.read())
            try:
                df = pd.read_excel(data)
            except Exception:
                data.seek(0)
                xl = pd.ExcelFile(data)
                df = pd.read_excel(xl, sheet_name=xl.sheet_names[0])

            report = build_report(df)
            return render_template("index.html", report=report, error=None, filename=filename)
        except Exception as e:
            return render_template("index.html", report=None, error=f"Failed to analyze file: {e}", filename=None)

    @app.route("/api/ping")
    def ping():
        return jsonify({"ok": True})

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
