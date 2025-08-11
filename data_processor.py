import pandas as pd
from sqlalchemy import create_engine, text

def process_and_analyze_data_with_mapping(filepath, column_map):
    engine = create_engine('sqlite:///:memory:')
    try:
        # Use chunking to read large files efficiently
        chunk_size = 50000  # Adjust as needed based on your system's memory
        cleaned_df_list = []
        
        for chunk in pd.read_csv(filepath, encoding='latin1', chunksize=chunk_size):
            # The core processing logic is applied to each chunk
            mapped_columns = {key: value for key, value in column_map.items() if value}
            
            rename_dict = {}
            for original_col, new_col in {
                mapped_columns.get('customer_id_col'): 'customer_id',
                mapped_columns.get('quantity_col'): 'quantity',
                mapped_columns.get('unit_price_col'): 'unit_price',
                mapped_columns.get('invoice_date_col'): 'invoice_date',
                mapped_columns.get('description_col'): 'product',
                mapped_columns.get('country_col'): 'country',
                mapped_columns.get('invoiceno_col'): 'invoiceno'
            }.items():
                if original_col and original_col in chunk.columns:
                    rename_dict[original_col] = new_col
            
            chunk.rename(columns=rename_dict, inplace=True)
            
            # Perform cleaning and calculations on the chunk
            if 'quantity' in chunk.columns and 'unit_price' in chunk.columns:
                chunk['quantity'] = pd.to_numeric(chunk['quantity'], errors='coerce')
                chunk['unit_price'] = pd.to_numeric(chunk['unit_price'], errors='coerce')
                chunk['total_sales'] = chunk['quantity'] * chunk['unit_price']
            
            if 'invoice_date' in chunk.columns:
                chunk['invoice_date'] = pd.to_datetime(chunk['invoice_date'])
                chunk['day_of_week'] = chunk['invoice_date'].dt.day_name()
                chunk['hour_of_day'] = chunk['invoice_date'].dt.hour
            
            # Remove rows with any missing values
            chunk.dropna(inplace=True)
            
            cleaned_df_list.append(chunk)
        
        # Concatenate all cleaned chunks into a single DataFrame
        df = pd.concat(cleaned_df_list, ignore_index=True)
        
        # Load the final, consolidated DataFrame into the in-memory database
        df.to_sql('uploaded_data', con=engine, if_exists='replace', index=False)
        
        results = {}

        with engine.connect() as conn:
            # --- Key Metrics Queries ---
            if 'total_sales' in df.columns:
                query_total_revenue = text("SELECT SUM(total_sales) FROM uploaded_data")
                total_revenue = conn.execute(query_total_revenue).scalar()
                results['Total Revenue'] = f"${total_revenue:,.2f}" if total_revenue is not None else "N/A"
            else:
                results['Total Revenue'] = "N/A"
            
            if 'invoiceno' in df.columns:
                query_total_transactions = text("SELECT COUNT(DISTINCT invoiceno) FROM uploaded_data")
                total_transactions = conn.execute(query_total_transactions).scalar()
                results['Total Transactions'] = total_transactions if total_transactions is not None else "N/A"
            else:
                results['Total Transactions'] = "N/A"
            
            if 'customer_id' in df.columns:
                query_unique_customers = text("SELECT COUNT(DISTINCT customer_id) FROM uploaded_data")
                unique_customers = conn.execute(query_unique_customers).scalar()
                results['Unique Customers'] = unique_customers if unique_customers is not None else "N/A"
            else:
                results['Unique Customers'] = "N/A"

            # --- Advanced Analysis Queries ---
            if all(col in df.columns for col in ['invoice_date', 'total_sales']):
                query_monthly_sales = text("SELECT strftime('%Y-%m', invoice_date) as month, SUM(total_sales) as monthly_sales FROM uploaded_data GROUP BY month ORDER BY month")
                monthly_sales_result = conn.execute(query_monthly_sales).fetchall()
                results["Monthly Sales Trends"] = [{"month": row[0], "sales": round(row[1], 2)} for row in monthly_sales_result]
            else:
                results["Monthly Sales Trends"] = None
            
            if all(col in df.columns for col in ['product', 'total_sales']):
                query_top_products = text("SELECT product, SUM(total_sales) AS total_sales FROM uploaded_data GROUP BY product ORDER BY total_sales DESC LIMIT 5")
                top_products_result = conn.execute(query_top_products).fetchall()
                results["Top Products"] = [{"product": row[0], "total_sales": row[1]} for row in top_products_result]
            else:
                results["Top Products"] = None
            
            if all(col in df.columns for col in ['country', 'total_sales']):
                query_sales_by_country = text("SELECT country, SUM(total_sales) AS total_sales FROM uploaded_data GROUP BY country ORDER BY total_sales DESC")
                sales_by_country_result = conn.execute(query_sales_by_country).fetchall()
                results["Sales by Country"] = [{"country": row[0], "total_sales": row[1]} for row in sales_by_country_result]
            else:
                results["Sales by Country"] = None

            if all(col in df.columns for col in ['customer_id', 'total_sales']):
                query_top_customers = text("SELECT customer_id, SUM(total_sales) AS total_revenue FROM uploaded_data GROUP BY customer_id ORDER BY total_revenue DESC LIMIT 5")
                top_customers_result = conn.execute(query_top_customers).fetchall()
                results["Top Customers"] = [{"customer_id": int(row[0]), "total_revenue": row[1]} for row in top_customers_result]
            else:
                results["Top Customers"] = None

            # New queries for additional graphs
            if all(col in df.columns for col in ['day_of_week', 'total_sales']):
                query_sales_by_day = text("SELECT day_of_week, SUM(total_sales) as sales FROM uploaded_data GROUP BY day_of_week ORDER BY sales DESC")
                sales_by_day_result = conn.execute(query_sales_by_day).fetchall()
                results["Sales by Day"] = [{"day": row[0], "sales": row[1]} for row in sales_by_day_result]
            else:
                results["Sales by Day"] = None
            
            if all(col in df.columns for col in ['hour_of_day', 'total_sales']):
                query_sales_by_hour = text("SELECT hour_of_day, SUM(total_sales) as sales FROM uploaded_data GROUP BY hour_of_day ORDER BY hour_of_day")
                sales_by_hour_result = conn.execute(query_sales_by_hour).fetchall()
                results["Sales by Hour"] = [{"hour": row[0], "sales": row[1]} for row in sales_by_hour_result]
            else:
                results["Sales by Hour"] = None

            if all(col in df.columns for col in ['invoice_date', 'total_sales', 'invoiceno']):
                query_monthly_combined = text("SELECT strftime('%Y-%m', invoice_date) as month, SUM(total_sales) as monthly_sales, SUM(total_sales) / COUNT(DISTINCT invoiceno) as aov FROM uploaded_data GROUP BY month ORDER BY month")
                monthly_combined_result = conn.execute(query_monthly_combined).fetchall()
                results["Sales and AOV by Month"] = [{"month": row[0], "monthly_sales": round(row[1], 2), "aov": round(row[2], 2)} for row in monthly_combined_result]
            else:
                results["Sales and AOV by Month"] = None

        return results

    except pd.errors.EmptyDataError:
        return {"error": "The uploaded CSV file is empty."}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}