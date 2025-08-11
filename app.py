import os
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
import pandas as pd
from data_processor import process_and_analyze_data_with_mapping

UPLOAD_FOLDER = 'uploads'
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'csv'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            df = pd.read_csv(filepath, encoding='latin1', nrows=5)
            columns = df.columns.tolist()
            return jsonify({"filename": filename, "columns": columns}), 200
        except Exception as e:
            return jsonify({"error": f"Error reading file headers: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a CSV file."}), 400

@app.route('/analyze', methods=['POST'])
def analyze_data():
    data = request.get_json()
    filename = data.get('filename')
    column_map = data.get('column_map')

    if not filename or not column_map:
        return jsonify({"error": "Missing filename or column mapping."}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found. Please re-upload."}), 404
        
    analysis_results = process_and_analyze_data_with_mapping(filepath, column_map)
    
    os.remove(filepath)
    
    if "error" in analysis_results:
        return jsonify(analysis_results), 500
    
    return jsonify(analysis_results), 200

if __name__ == '__main__':
    app.run(debug=True)