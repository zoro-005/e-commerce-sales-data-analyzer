import pandas as pd
file_path = "data.csv"
try:
    df = pd.read_csv(file_path, encoding = "latin1")
    print("Data loaded")
    print("--------- first 5 rows -----------")
    print(df.head())
    print("---------data info-------")
    print(df.info())
    print('--------cleaning and modification---------')
    df.dropna(subset = ['CustomerID', 'Description'], inplace = True)
    df['CustomerID'] = df['CustomerID'].astype(int)
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    df['Total_Price'] = df['Quantity'] * df['UnitPrice']
    print("---------new data----------")
    print(df.info())
except FileNotFoundError:
    print(f"File not found at path {file_path}")