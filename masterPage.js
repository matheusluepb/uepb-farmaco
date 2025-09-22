// O código neste arquivo será carregado em todas as páginas do seu site

// No código da página onde você quer implementar a busca
import wixData from 'wix-data';

$w.onReady(function () {
    // Configura eventos de busca
    $w("#searchButton").onClick(searchPages);
    $w("#searchInput").onKeyPress((event) => {
        if (event.key === "Enter") searchPages();
    });
});

async function searchPages() {
    const searchTerm = $w("#searchInput").value.toLowerCase().trim();
    
    if (!searchTerm) {
        $w("#resultsText").text = "Digite um termo para buscar";
        return;
    }

    try {
        // Busca em todas as páginas indexadas
        const results = await wixData.query("PaginasIndex")
            .contains("conteudo", searchTerm)
            .or(wixData.query("PaginasIndex").contains("titulo", searchTerm))
            .find();

        displayPageResults(results.items, searchTerm);
    } catch (error) {
        console.error("Erro na busca:", error);
        $w("#resultsText").text = "Erro ao buscar páginas";
    }
}

function displayPageResults(pages, searchTerm) {
    if (pages.length === 0) {
        $w("#resultsText").text = `Nenhuma página encontrada com "${searchTerm}"`;
        $w("#resultsRepeater").data = [];
        return;
    }

    $w("#resultsText").text = `${pages.length} páginas encontradas:`;
    
    // Destaca o termo buscado nos resultados
    const formattedResults = pages.map(page => {
        return {
            ...page,
            highlightedContent: highlightTerm(page.conteudo, searchTerm),
            highlightedTitle: highlightTerm(page.titulo, searchTerm)
        };
    });

    $w("#resultsRepeater").data = formattedResults;
    
    $w("#resultsRepeater").onItemReady(($item, itemData) => {
        $item("#pageTitle").html = itemData.highlightedTitle;
        $item("#pageExcerpt").html = getExcerpt(itemData.highlightedContent, 150);
        $item("#pageLink").onClick(Event() => {
            wixLocation.to(itemData.url);
        });
    });
}

// Função para destacar o termo buscado
function highlightTerm(text, term) {
    if (!text) return "";
    const regex = new RegExp(`(${term})`, "gi");
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Função para criar um excerto do conteúdo
function getExcerpt(text, maxLength) {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}// Código para ser executado uma vez para indexar suas páginas
async function indexAllPages() {
    const pages = [
        { id: "link-medicamentos-1-title", title: "Página Inicial", url: "/home" },
        // Adicione todas suas páginas aqui
    ];

    for (const page of pages) {
        // Obtenha o conteúdo da página (isso varia conforme sua implementação)
        const pageContent = await getPageContent(page.id);
        
        await wixData.insert("PaginasIndex", {
            titulo: page.title,
            conteudo: pageContent,
            url: page.url,
            paginaId: page.id
        });
    }
}

// Função de exemplo para extrair conteúdo de uma página
async function getPageContent(pageId) {
    // Implementação depende de como seu conteúdo está estruturado
    // Pode usar $w(`#${elementId}`).text para pegar texto de elementos específicos
    return "Conteúdo extraído da página...";
} 


/// 


// backend/indexPages.jsw
import wixData from 'wix-data';
import wixSiteContent from 'wix-site-content-backend';
import { getSecret } from 'wix-secrets-backend';

// Esta função irá indexar todas as páginas do seu site
export async function indexAllPages() {
  try {
    // Busca a lista de todas as páginas públicas do site
    const { pages } = await wixSiteContent.getSitePages();

    // Limpa a coleção para evitar duplicatas em re-indexações
    await wixData.truncate("PaginasIndex");

    // Array para armazenar os itens a serem inseridos
    const itemsToInsert = [];

    for (const page of pages) {
      if (page.pageDetails.type === 'PAGE') {
        const pageContent = await wixSiteContent.getPageContent(page.pageDetails.id);

        itemsToInsert.push({
          titulo: page.pageDetails.title || page.pageDetails.displayName,
          conteudo: pageContent.plainTextContent || "",
          url: page.url,
          paginaId: page.pageDetails.id
        });
      }
    }

    // Insere todos os itens de uma vez para melhor performance
    await wixData.bulkInsert("PaginasIndex", itemsToInsert);
    console.log(`Indexação completa! ${itemsToInsert.length} páginas indexadas.`);
    return { success: true, count: itemsToInsert.length };

  } catch (error) {
    console.error("Erro na indexação de páginas:", error);
    return { success: false, error: error.message };
  }
}

// Chame esta função manualmente em um botão no modo admin, ou agende-a.
// Exemplo: no editor Velo, em uma página de admin, adicione um botão com o evento onClick:
// import { indexAllPages } from 'backend/indexPages.jsw';
// $w('#meuBotaoIndexar').onClick(async () => {
//   const result = await indexAllPages();
//   if (result.success) {
//     $w('#statusText').text = `Indexação concluída: ${result.count} páginas indexadas.`;
//   } else {
//     $w('#statusText').text = `Erro na indexação: ${result.error}`;
//   }
// });
