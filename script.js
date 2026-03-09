// --- Global DOM Variables ---
const appContainer = document.getElementById('appContainer');
const libraryGrid = document.getElementById('libraryGrid');
const libraryMessage = document.getElementById('libraryMessage');
const emptyLibraryMessage = document.getElementById('emptyLibraryMessage');
const appLoadingSpinner = document.getElementById('appLoadingSpinner');
const collectionFiltersContainer = document.getElementById('collectionFilters');
const searchInput = document.getElementById('searchInput');
const appLogoImg = document.getElementById('appLogoImg');
const sortControls = document.getElementById('sortControls');

let currentCollectionFilter = 'all';
let currentSortMethod = 'alpha'; // 'alpha' o 'date'
let remoteLibraryBooks = [];

// --- Configuración ---
const REMOTE_LIBRARY_CONFIG = {
    baseUrl: window.location.origin + window.location.pathname,
    indexFile: "datos/catalogo_edunlu.json"
};
const LOGO_URL = "https://EdUNLu-editorial.github.io/catalogo-web/logos/edunlu-original.svg";

// Datos de ejemplo para el caso de fallo en la carga remota
const MOCK_LIBRARY_INDEX = [
    { "id": "agendas-de-ordenamiento-ambiental-id", "title": "Agendas de ordenamiento ambiental", "author": "Nélida da Costa Pereira y María Cecilia Poggi", "collection": "Sociedad en movimiento", "targetUrl": "https://www.edunlu.unlu.edu.ar/?q=node/174/", "coverImageUrl": "covers/agendas-ordenamiento.gif", "publishDate": "2019-02-10" },
];

// --- Funciones Auxiliares ---
function displayMessage(element, message, autoHide = true) {
    if (!element) return;
    element.textContent = message;
    element.className = `message-base error-message`;
    element.style.display = 'block';
    if (autoHide) {
        setTimeout(() => hideMessage(element), 5000);
    }
}
function hideMessage(element) {
    if (element) { element.style.display = 'none'; element.textContent = ''; }
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Sin fecha';
    }
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
}

// --- Renderizado de la Biblioteca ---
function renderRemoteLibraryView() {
    libraryGrid.innerHTML = '';
    hideMessage(libraryMessage);

    const searchTerm = searchInput.value.toLowerCase().trim();

    const searchedBooks = remoteLibraryBooks.filter(book => {
        if (!searchTerm) return true;
        const titleMatch = (book.title || '').toLowerCase().includes(searchTerm);
        const authorMatch = (book.author || '').toLowerCase().includes(searchTerm);
        return titleMatch || authorMatch;
    });

    const filteredBooks = searchedBooks.filter(book =>
        currentCollectionFilter === 'all' || book.collection === currentCollectionFilter
    );

    // Ordenar los libros filtrados
    if (currentSortMethod === 'date') {
        filteredBooks.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    } else { // 'alpha'
        filteredBooks.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    emptyLibraryMessage.classList.toggle('hidden', filteredBooks.length > 0);
    if (filteredBooks.length === 0) {
        emptyLibraryMessage.textContent = searchTerm
            ? `No se encontraron resultados para "${searchInput.value}".`
            : `No hay elementos en la colección "${currentCollectionFilter}".`;
    }

    filteredBooks.forEach(bookItem => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'library-item';

        const coverImg = document.createElement('img');
        coverImg.className = 'library-item-cover';
        coverImg.src = bookItem.coverImageUrl ? (new URL(bookItem.coverImageUrl, REMOTE_LIBRARY_CONFIG.baseUrl).href) : 'https://placehold.co/200x280/e0e0e0/777777?text=Sin+Portada';
        coverImg.alt = `Portada de ${bookItem.title}`;
        coverImg.onerror = function () { this.src = 'https://placehold.co/200x280/e0e0e0/777777?text=Error'; };
        itemDiv.appendChild(coverImg);

        const title = document.createElement('h3');
        title.textContent = bookItem.title || bookItem.id;
        title.title = bookItem.title || bookItem.id;
        itemDiv.appendChild(title);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'item-meta';
        const authorSpan = document.createElement('div');
        authorSpan.className = 'item-author';
        authorSpan.textContent = bookItem.author || 'Autor desconocido';
        const dateSpan = document.createElement('div');
        dateSpan.textContent = formatDate(bookItem.publishDate);
        metaDiv.appendChild(authorSpan);
        metaDiv.appendChild(dateSpan);
        itemDiv.appendChild(metaDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'library-item-actions';

        const viewButton = document.createElement('button');
        viewButton.textContent = 'Ver';
        viewButton.className = 'btn btn-view btn-sm';
        viewButton.addEventListener('click', () => {
            if (bookItem.targetUrl) {
                window.open(bookItem.targetUrl, '_blank');
            } else {
                displayMessage(libraryMessage, "Este elemento no tiene una URL de destino.");
            }
        });
        actionsDiv.appendChild(viewButton);
        itemDiv.appendChild(actionsDiv);

        libraryGrid.appendChild(itemDiv);
    });

    // Actualizar botones activos
    document.querySelectorAll('.filter-sort-controls button').forEach(button => button.classList.remove('active'));
    document.querySelector(`#collectionFilters [data-collection="${currentCollectionFilter}"]`).classList.add('active');
    document.querySelector(`#sortControls [data-sort="${currentSortMethod}"]`).classList.add('active');
}

async function fetchAndRenderRemoteLibrary() {
    try {
        const response = await fetch(new URL(REMOTE_LIBRARY_CONFIG.indexFile, REMOTE_LIBRARY_CONFIG.baseUrl), { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Error en la red: ${response.statusText}`);
        }
        // Coma
        let rawText = await response.text();
        const cleanedText = rawText.replace(/,\s*([\]}])/g, '$1');
        remoteLibraryBooks = JSON.parse(cleanedText);

        renderRemoteLibraryView();

    } catch (error) {
        console.error("Fallo al cargar la biblioteca remota:", error);
        displayMessage(libraryMessage, "Error al cargar la biblioteca. Usando datos de ejemplo.", false);
        remoteLibraryBooks = MOCK_LIBRARY_INDEX;
        renderRemoteLibraryView();
    } finally {
        appLoadingSpinner.style.display = 'none';
        appContainer.style.visibility = 'visible';
    }
}

// --- Manejadores de Eventos ---
collectionFiltersContainer.addEventListener('click', (event) => {
    if (event.target.dataset.collection) {
        currentCollectionFilter = event.target.dataset.collection;
        renderRemoteLibraryView();
    }
});

sortControls.addEventListener('click', (event) => {
    if (event.target.dataset.sort) {
        currentSortMethod = event.target.dataset.sort;
        renderRemoteLibraryView();
    }
});

searchInput.addEventListener('input', () => {
    renderRemoteLibraryView();
});

// --- Inicialización ---
function initializeApp() {
    document.getElementById('year').textContent = new Date().getFullYear();
    if (appLogoImg) {
        appLogoImg.src = LOGO_URL;
    }
    fetchAndRenderRemoteLibrary();
}

initializeApp();
