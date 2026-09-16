/**
 * Fetches and displays GitHub releases for the EasyScanlate repository.
 * Editorial index style — matches roadmap sharp system.
 */

const REPO_OWNER = 'Liiesl';
const REPO_NAME = 'EasyScanlate';
const RELEASES_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
const RELEASES_PAGE_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Escape first, then linkify markdown [text](https://...), **bold**, and
// bare https:// URLs. Link hrefs are restricted to http(s) so escaped
// payloads can't become javascript: links.
function renderInlineMarkdown(value) {
    let safe = escapeHtml(value);
    safe = safe.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(
        /(?<![\"'>=])https?:\/\/[^\s<]+[^\s<).,;:!?]/g,
        (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
    );
    return safe;
}

function isDisclaimerHeader(header) {
    return (
        header.includes('after installation') ||
        header.includes('antivirus') ||
        header.includes('disclaimer') ||
        header.includes('installation instructions')
    );
}

function cleanSummaryText(text) {
    const flat = String(text || '').replace(/\s+/g, ' ').trim();
    if (flat.length <= 320) return flat;
    return `${flat.slice(0, 320).replace(/\s+\S*$/, '')}…`;
}

function parseReleaseBody(body) {
    const sections = {
        summary: '',
        added: [],
        changed: [],
        fixed: [],
        notices: [],
        compareUrl: '',
    };

    if (!body) return sections;

    const text = String(body);

    // "**Full Changelog**: https://github.com/.../compare/vX...vY" footer.
    const compareMatch = text.match(/\*\*Full Changelog\*\*\s*:?\s*(https?:\/\/[^\s<]+)/i);
    if (compareMatch) {
        sections.compareUrl = compareMatch[1].replace(/[).,;:!?]+$/, '');
    }

    // Normalize line endings
    const normalizedBody = text.replace(/\r\n/g, '\n');

    // Split by "### " to get main sections. Index 0 is the preamble
    // (intro prose, blockquotes, rules) before the first section.
    const rawSections = normalizedBody.split(/^###\s+/gm);

    // Real bodies use "Modified" (newer) and "Changed" (v0.2.0) interchangeably.
    const preambleLines = (rawSections[0] || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(
            (line) =>
                line.length > 0 &&
                !line.startsWith('>') &&
                line !== '---' &&
                !line.startsWith('#') &&
                !/antivirus/i.test(line) &&
                !/full changelog/i.test(line),
        );
    if (preambleLines.length > 0) {
        sections.summary = cleanSummaryText(preambleLines.join(' '));
    }

    rawSections.slice(1).forEach((section) => {
        const lines = section.trim().split('\n');
        if (lines.length === 0) return;
        const title = lines[0].trim();
        const header = title.toLowerCase();
        const content = lines.slice(1).join('\n').trim();

        if (isDisclaimerHeader(header)) {
            // Skip installer / AV disclaimer sections
            return;
        } else if (header.startsWith('added')) {
            sections.added = parseListItems(content);
        } else if (header.startsWith('changed') || header.startsWith('modified')) {
            sections.changed = parseListItems(content);
        } else if (header.startsWith('fixed')) {
            sections.fixed = parseListItems(content);
        } else if (title) {
            // Anything else from the author (e.g. upgrade notices) is kept
            // as a notice instead of being silently dropped.
            sections.notices.push({ title, items: parseListItems(content) });
        }
    });

    return sections;
}

function parseListItems(text) {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^[-*+]\s+/.test(line))
        .map((line) => line.replace(/^[-*+]\s+/, '').trim())
        .filter((line) => line.length > 0);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', options);
}

function displayVersion(tagName) {
    const tag = String(tagName || '').trim() || 'unknown';
    return tag.startsWith('v') ? tag.substring(1) : tag;
}

function showSkeleton(container) {
    container.innerHTML = `
        <div class="skeleton-card" aria-hidden="true"><span class="skeleton-line w-40"></span><span class="skeleton-line"></span><span class="skeleton-line w-70"></span></div>
        <div class="skeleton-card" aria-hidden="true"><span class="skeleton-line w-60"></span><span class="skeleton-line w-80"></span></div>
    `;
}

function renderReleases(releases) {
    const container = document.getElementById('releases-container');
    if (!container) return;

    container.innerHTML = ''; // Clear skeleton / static content

    const published = (releases || [])
        .filter((release) => release && !release.draft)
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    if (published.length === 0) {
        container.innerHTML =
            '<p class="empty-message"><strong>No releases yet.</strong>Check back soon — shipped work will appear here.</p>';
        return;
    }

    published.forEach((release, index) => {
        const { tag_name, published_at, body, html_url, prerelease, name } = release;
        const sections = parseReleaseBody(body);
        const version = displayVersion(tag_name);
        const dateLabel = formatDate(published_at);

        const article = document.createElement('article');
        article.className = 'release-entry' + (index === 0 ? ' release-entry-latest' : '');

        const counts = [];
        if (sections.added.length > 0)
            counts.push(`${sections.added.length} new`);
        if (sections.changed.length > 0)
            counts.push(`${sections.changed.length} changed`);
        if (sections.fixed.length > 0)
            counts.push(`${sections.fixed.length} fixed`);

        const releaseUrl = typeof html_url === 'string' && html_url ? html_url : RELEASES_PAGE_URL;
        const tagLabel = escapeHtml(tag_name || version);

        let headerHtml = `<div class="release-title-row"><h2>Version ${escapeHtml(version)}</h2>`;
        if (index === 0) headerHtml += `<span class="tag new">Latest</span>`;
        if (prerelease) headerHtml += `<span class="tag improved">Pre-release</span>`;
        if (name && String(name).trim() && String(name).trim() !== String(tag_name).trim()) {
            headerHtml += `<span class="release-tag">${escapeHtml(String(name).trim().slice(0, 80))}</span>`;
        }
        headerHtml += `</div>`;

        let metaHtml = `<div class="release-meta">`;
        if (published_at) {
            metaHtml += `<time datetime="${escapeHtml(published_at)}">${escapeHtml(dateLabel)}</time><span class="release-tag">${tagLabel}</span>`;
        } else {
            metaHtml += `<span class="release-tag">${tagLabel}</span>`;
        }
        if (counts.length > 0) {
            metaHtml += `<span class="release-counts">${escapeHtml(counts.join(' · '))}</span>`;
        }
        if (sections.compareUrl) {
            metaHtml += `<a class="release-github-link" href="${escapeHtml(sections.compareUrl)}" target="_blank" rel="noopener noreferrer">Full Changelog &rarr;</a>`;
        }
        metaHtml += `<a class="release-github-link" href="${escapeHtml(releaseUrl)}" target="_blank" rel="noopener noreferrer">View on GitHub &rarr;</a>`;
        metaHtml += `</div>`;

        let bodyHtml = '';
        if (sections.summary) {
            bodyHtml += `<p class="release-summary">${renderInlineMarkdown(sections.summary)}</p>`;
        }
        sections.notices.forEach((notice) => {
            bodyHtml += `<div class="release-notice"><strong>${renderInlineMarkdown(notice.title)}</strong>`;
            if (notice.items.length > 0) {
                bodyHtml += `<ul class="release-notice-list">`;
                notice.items.forEach((item) => {
                    bodyHtml += `<li>${renderInlineMarkdown(item)}</li>`;
                });
                bodyHtml += `</ul>`;
            }
            bodyHtml += `</div>`;
        });

        let changelogHtml = '';
        const groups = [
            [sections.added, 'new', 'New'],
            [sections.changed, 'improved', 'Changed'],
            [sections.fixed, 'fixed', 'Fixed'],
        ];
        const hasItems = groups.some(([items]) => items.length > 0);
        if (hasItems) {
            changelogHtml = `<ul class="changelog">`;
            groups.forEach(([items, type, label]) => {
                items.forEach((item) => {
                    changelogHtml += `<li><span class="tag ${type}">${label}</span> ${renderInlineMarkdown(item)}</li>`;
                });
            });
            changelogHtml += `</ul>`;
        } else {
            changelogHtml = `<p class="release-counts">See <a class="release-github-link" href="${escapeHtml(releaseUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a> for details.</p>`;
        }

        article.innerHTML = `
            <div class="release-body">${headerHtml}${metaHtml}${bodyHtml}${changelogHtml}</div>
        `;
        container.appendChild(article);
    });
}

function displayError() {
    const container = document.getElementById('releases-container');
    if (!container) return;
    container.innerHTML =
        `<p class="error-message">Couldn't load releases. <a href="#" id="releases-retry">Retry</a> · <a href="${escapeHtml(RELEASES_PAGE_URL)}" target="_blank" rel="noopener noreferrer">View on GitHub</a></p>`;
    const retry = document.getElementById('releases-retry');
    if (retry) {
        retry.addEventListener('click', (event) => {
            event.preventDefault();
            showSkeleton(container);
            fetchReleases();
        });
    }
}

async function fetchReleases() {
    const container = document.getElementById('releases-container');
    try {
        const response = await fetch(RELEASES_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const releases = await response.json();
        renderReleases(releases);
    } catch (error) {
        console.error('Error fetching releases:', error);
        if (container && container.querySelector('.skeleton-card')) {
            // Skeleton already visible — swap directly to error.
        }
        displayError();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', fetchReleases);
