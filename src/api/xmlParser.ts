/**
 * Utilitaire pour convertir un XML PrestaShop en objet JSON simple
 */
export const xmlToJson = (xmlString: string): any => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const parseNode = (node: Node): any => {
    // 1. Gérer les nœuds de texte/CDATA directs
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      return node.nodeValue?.trim() ?? "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Vérifier s'il y a des sous-éléments
      const childElements = Array.from(element.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
      
      if (childElements.length === 0) {
        // C'est un nœud terminal (ex: <id>2</id> ou <name><![CDATA[Produit]]></name>)
        // On récupère tout le texte combiné (text + cdata)
        return element.textContent?.trim() ?? "";
      }

      // S'il y a des sous-éléments, on construit un objet
      const obj: any = {};
      
      childElements.forEach(child => {
        const childName = child.nodeName;
        const result = parseNode(child);
        
        if (obj[childName]) {
          if (!Array.isArray(obj[childName])) {
            obj[childName] = [obj[childName]];
          }
          obj[childName].push(result);
        } else {
          obj[childName] = result;
        }
      });
      
      return obj;
    }

    return null;
  };

  return parseNode(xmlDoc.documentElement);
};
