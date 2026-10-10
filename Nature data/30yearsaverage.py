# Python: 30 years average for each district, date
# "C:\Users\pintu\OneDrive\Desktop\rolling_temp.py"



import pandas as pd


# 1. Load Excel file
file_path = r"C:\Users\pintu\OneDrive\Desktop\try\MH_ERA5Land_DailyTemp_1967_2025.xlsx"
df = pd.read_excel(file_path)


# 2. Ensure date is datetime
df["date_t"] = pd.to_datetime(df["date_t"], errors="coerce")


# 3. Ensure numeric
for col in ["mean_temp", "max_temp", "min_temp"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    else:
        raise ValueError(f"Column {col} missing in dataset!")


# 4. Add terrain classification
coastal = ['Mumbai City', 'Palghar', 'Ratnagiri', 'Raigad', 'Sindhudurg', 'Mumbai Suburban']
hilly = [
    'Ahmednagar', 'Akola', 'Aurangabad', 'Bhandara', 'Hingoli', 'Jalna',
    'Kolhapur', 'Latur', 'Nanded', 'Nashik', 'Parbhani', 'Pune',
    'Sangli', 'Satara', 'Solapur', 'Osmanabad', 'Washim', 'Yavatmal'
]


def classify_terrain(district):
    if district in coastal:
        return "coastal"
    elif district in hilly:
        return "hilly"
    else:
        return "plains"


df["terrain"] = df["district"].apply(classify_terrain)


# 5. Extract date parts
df["month"] = df["date_t"].dt.month
df["day"] = df["date_t"].dt.day
df["year"] = df["date_t"].dt.year


# 6. Compute rolling 30-year same-day averages
results = []


for district, sub in df.groupby("district"):
    sub = sub.sort_values("date_t").reset_index(drop=True)


    for idx, row in sub.iterrows():
        target_year = row["year"]
        month = row["month"]
        day = row["day"]


        # same-day temps from 30 years prior (exclude current year)
        mask = (
            (sub["month"] == month) &
            (sub["day"] == day) &
            (sub["year"].between(target_year - 30, target_year - 1))
        )
        past_30yrs = sub.loc[mask, "mean_temp"]


        avg_temp_30yr = past_30yrs.mean() if not past_30yrs.empty else None


        # next day max_temp
        next_day_max = None
        if idx + 1 < len(sub):
            next_day_max = sub.loc[idx + 1, "max_temp"]


        results.append({
            "date_t": row["date_t"],
            "district": district,
            "terrain": row["terrain"],
            "mean_temp": row["mean_temp"],
            "min_temp": row["min_temp"],
            "max_temp": row["max_temp"],
            "avg_temp_30yr": avg_temp_30yr,
            "next_day_max": next_day_max
        })


rolling_df = pd.DataFrame(results)


# 7. Filter final study period (1997–2025)
rolling_df = rolling_df[
    (rolling_df["date_t"] >= "1997-01-01") &
    (rolling_df["date_t"] <= "2025-08-19")
]


# 8. Save
output_path = r"C:\Users\pintu\OneDrive\Desktop\try\MH_Districts_30yrAvg_Terrain.xlsx"
rolling_df.to_excel(output_path, index=False)


print("✅ Done! Saved:", output_path)