/***
So damn lazy to be updating this manually, so if you find it useful don't forget to star
**/
const fs = require('fs');
const path = require('path');

const ORG = 'boy-offi9-inc';
const README_PATH = path.join(__dirname, '..', 'README.md');
const START_MARKER = '<!-- PROJECTS:START -->';
const END_MARKER = '<!-- PROJECTS:END -->';

// Repos to ignore (special repos like .github, template repos, etc)
const IGNORED_REPOS = ['.github', '.gitignore', 'template', 'profile'];

async function fetchOrgRepos(org) {
    const headers = {
        Accept: 'application/vnd.github+json'
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/orgs/${org}/repos?type=public&sort=updated&per_page=100`, {
        headers,
    });

    if (!res.ok) {
        throw new Error(`GitHub API request failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

function isIgnoredRepo(repoName) {
    return IGNORED_REPOS.includes(repoName.toLowerCase()) || 
           repoName.toLowerCase().startsWith('.github');
}

function buildTable(repos) {
    // Filter: exclude archived repos, forked repos, and ignored special repos
    const visible = repos.filter((r) => !r.archived && !r.fork && !isIgnoredRepo(r.name));

    if (visible.length === 0) {
        return '_No public projects yet — check back soon._';
    }

    const rows = visible.map((r) => {
        const badge = r.fork ? '🔀' : '✨'; // Fork indicator vs original
        const name = `${badge} [${r.name}](${r.html_url})`;
        const description = r.description ? r.description.replace(/\|/g, '\\|') : '—';
        const language = r.language || '—';
        const stars = r.stargazers_count ?? 0;
        return `| ${name} | ${description} | ${language} | ⭐ ${stars} |`;
    });

    return [
        '| Project | Description | Language | Stars |',
        '|---|---|---|---|',
        ...rows,
    ].join('\n');
}

function injectIntoReadme(table) {
    const readme = fs.readFileSync(README_PATH, 'utf8');

    const startIdx = readme.indexOf(START_MARKER);
    const endIdx = readme.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error(`Could not find ${START_MARKER} / ${END_MARKER} markers in README.md`);
    }

    const before = readme.slice(0, startIdx + START_MARKER.length);
    const after = readme.slice(endIdx);
    const updated = `${before}\n${table}\n${after}`;

    fs.writeFileSync(README_PATH, updated);
}

async function main() {
    const repos = await fetchOrgRepos(ORG);
    const table = buildTable(repos);
    injectIntoReadme(table);
    
    const totalRepos = repos.length;
    const ignoredCount = repos.filter(r => isIgnoredRepo(r.name)).length;
    const forkedCount = repos.filter(r => r.fork).length;
    const displayedCount = repos.filter(r => !r.archived && !r.fork && !isIgnoredRepo(r.name)).length;
    
    console.log(`✅ Updated README.md`);
    console.log(`   Total repos: ${totalRepos}`);
    console.log(`   Ignored (special): ${ignoredCount}`);
    console.log(`   Forked: ${forkedCount}`);
    console.log(`   Displayed: ${displayedCount}`);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
