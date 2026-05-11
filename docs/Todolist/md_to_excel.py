import pandas as pd
import os

def md_to_excel(md_filepath, excel_filepath):
    """
    Lit un fichier Markdown contenant un tableau et le convertit en fichier Excel.
    """
    if not os.path.exists(md_filepath):
        print(f"Le fichier {md_filepath} n'existe pas.")
        return

    with open(md_filepath, 'r', encoding='utf-8') as file:
        lines = file.readlines()

    # Trouver les lignes contenant un tableau (celles avec des pipes '|')
    table_lines = [line.strip() for line in lines if '|' in line]
    
    if not table_lines:
        print("Aucun tableau trouvé dans le fichier Markdown.")
        return

    # Extraire les en-têtes de colonnes
    headers = [col.strip() for col in table_lines[0].split('|') if col.strip()]
    
    # Extraire les données (on ignore la ligne de séparation markdown, généralement l'index 1)
    data = []
    for line in table_lines[2:]:
        row = [col.strip() for col in line.split('|')[1:-1]]
        if row:
            data.append(row)

    # Créer un DataFrame pandas
    df = pd.DataFrame(data, columns=headers)
    
    # Convertir les colonnes numériques si possible (pour l'Estimation)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='ignore')

    # Sauvegarder en Excel
    try:
        df.to_excel(excel_filepath, index=False, engine='openpyxl')
        print(f"Succès : Le fichier a été converti et sauvegardé sous {excel_filepath}")
    except Exception as e:
        print(f"Erreur lors de la sauvegarde du fichier Excel : {e}")

if __name__ == "__main__":
    # Noms des fichiers
    md_file = "todolist.md"
    excel_file = "todolist.xlsx"
    
    md_to_excel(md_file, excel_file)
