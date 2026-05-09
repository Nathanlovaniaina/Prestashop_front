# Documentation API PrestaShop & Conversion XML/JSON

Ce document explique comment le frontend communique avec l'API PrestaShop et comment les données XML sont transformées en JSON.

## 1. Appel de l'API PrestaShop

### Configuration et Proxy
Pour éviter les erreurs de **CORS**, nous utilisons un proxy configuré dans `vite.config.ts`. 
- Toutes les requêtes vers `/api/*` sont redirigées vers `http://localhost/prestashop/api/*`.
- Cela permet au navigateur de croire qu'il communique avec le même domaine (`localhost:5173`).

### Authentification (Basic Auth)
L'API PrestaShop utilise l'authentification **Basic Auth**. Dans notre code (`src/api/prestashop.ts`) :
- L'utilisateur est votre **Web Service Key**.
- Le mot de passe est laissé **vide**.
- Le header généré est : `Authorization: Basic base64(KEY:)`.

### Cas particulier des Images
Pour les images (`<img>`), le navigateur n'envoie pas de headers personnalisés. Pour éviter un pop-up d'authentification :
- Nous passons la clé directement dans l'URL : `/api/images/products/ID_PROD/ID_IMG?ws_key=VOTRE_CLE`.

---

## 2. Conversion XML vers JSON (`xmlParser.ts`)

PrestaShop renvoie par défaut du XML. Pour faciliter l'utilisation dans React, nous convertissons ce XML en objets JSON via un algorithme récursif.

### Le processus de conversion
L'utilitaire `xmlToJson` utilise l'API native `DOMParser` du navigateur pour transformer la chaîne XML en un arbre de nœuds DOM, puis parcourt cet arbre :

1. **Nœuds Terminaux (Feuilles)** :
   Si une balise ne contient que du texte ou une section `CDATA` (ex: `<id>2</id>` ou `<name><![CDATA[Mug]]></name>`), le parser extrait directement la valeur textuelle sous forme de **chaîne de caractères**.
   
2. **Nœuds Complexes (Objets)** :
   Si une balise contient d'autres balises (ex: `<product><id>1</id>...</product>`), elle est transformée en un **objet JavaScript**. Chaque sous-balise devient une propriété de cet objet.

3. **Listes (Tableaux)** :
   Si plusieurs balises identiques se suivent (ex: plusieurs balises `<product>` dans `<products>`), le parser les regroupe automatiquement dans un **tableau** (Array).

### Exemple de transformation
**XML Source :**
```xml
<prestashop>
  <products>
    <product>
      <id><![CDATA[6]]></id>
      <name><![CDATA[Mug]]></name>
    </product>
  </products>
</prestashop>
```

**JSON Résultat :**
```json
{
  "products": {
    "product": [
      {
        "id": "6",
        "name": "Mug"
      }
    ]
  }
}
```

### Robustesse (getLanguageValue)
PrestaShop utilise souvent des structures multi-langues. Notre fonction `getLanguageValue` dans les composants assure que nous récupérons toujours la bonne chaîne, même si elle est nichée dans un objet ou un tableau de langues.
