/**
 * Fetches and displays GitHub releases for the EasyScanlate repository.
 */

const REPO_OWNER = 'Liiesl';
const REPO_NAME = 'EasyScanlate';
const RELEASES_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;

async function fetchReleases() {
    try {
        const response = await fetch(RELEASES_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const releases = await response.json();
        renderReleases(releases);
    } catch (error) {
        console.error('Error fetching releases:', error);
        displayError();
    }
}

function parseReleaseBody(body) {
    const sections = {
        warning: null,
        added: [],
        changed: [],
        fixed: []
    };

    if (!body) return sections;

    // Normalize line endings
    const normalizedBody = body.replace(/\r\n/g, '\n');

    // Split by "### " to get main sections
    // We filter out empty strings resulting from the split
    const rawSections = normalizedBody.split(/^### /gm).filter(s => s.trim());

    rawSections.forEach(section => {
        const lines = section.trim().split('\n');
        const header = lines[0].trim().toLowerCase();
        const content = lines.slice(1).join('\n').trim();

        if (header.includes('after installation') || header.includes('antivirus')) {
            // Skip disclaimer section
            return;
        } else if (header.startsWith('added')) {
            sections.added = parseListItems(content);
        } else if (header.startsWith('changed')) {
            sections.changed = parseListItems(content);
        } else if (header.startsWith('fixed')) {
            sections.fixed = parseListItems(content);
        }
    });

    return sections;
}

function parseListItems(text) {
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim()); // Remove leading "-"
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function renderReleases(releases) {
    const container = document.getElementById('releases-container');
    if (!container) return;

    container.innerHTML = ''; // Clear loading state or static content

    releases.forEach(release => {
        const { tag_name, published_at, body } = release;
        const sections = parseReleaseBody(body);

        const article = document.createElement('article');
        article.className = 'release-version';

        // Header: Version and Date
        const header = document.createElement('h2');
        header.textContent = `Version ${tag_name}`; // tag_name usually includes 'v', e.g. v0.2.0

        // If tag_name already has 'v', we might want to avoid "Version v0.2.0"
        if (tag_name.startsWith('v')) {
            header.textContent = `Version ${tag_name.substring(1)}`;
        } else {
            header.textContent = `Version ${tag_name}`;
        }

        const time = document.createElement('time');
        time.setAttribute('datetime', published_at);
        time.textContent = formatDate(published_at);

        article.appendChild(header);
        article.appendChild(time);

        // Warning Section
        if (sections.warning) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'release-warning';
            // Convert markdown links to HTML links for the warning
            // Simple regex for [text](url)
            const warningHtml = sections.warning
                .replace(/^### (.*)/, '<strong>$1</strong>') // Make header bold
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/\n/g, '<br>');

            warningDiv.innerHTML = warningHtml;
            article.appendChild(warningDiv);
        }

        // Changelog List
        const changelog = document.createElement('ul');
        changelog.className = 'changelog';

        const createListItems = (items, type, label) => {
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="tag ${type}">${label}</span> ${item}`;
                changelog.appendChild(li);
            });
        };

        if (sections.added.length > 0) createListItems(sections.added, 'new', 'New');
        if (sections.changed.length > 0) createListItems(sections.changed, 'improved', 'Changed');
        if (sections.fixed.length > 0) createListItems(sections.fixed, 'fixed', 'Fixed');

        article.appendChild(changelog);
        container.appendChild(article);
    });
}

function displayError() {
    const container = document.getElementById('releases-container');
    if (container) {
        container.innerHTML = '<p class="error-message">Failed to load releases. Please check your internet connection or try again later.</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', fetchReleases);
