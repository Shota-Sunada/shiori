import pandas as pd

csv1 = pd.read_csv('csv1.csv')
csv2 = pd.read_csv('csv2.csv')

merged = pd.merge(csv2, csv1, on=['surname',"forename"], how='left')

merged.to_csv('merged.csv', index=False)

print("合併が完了しました！")
