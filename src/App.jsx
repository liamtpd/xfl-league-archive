import { Link, Routes, Route, useParams } from 'react-router-dom';

import league from './data/league.json';
import { useState } from 'react';

const managerById = Object.fromEntries(league.managers.map(m => [m.id, m]));

function managerName(id) {
  return managerById[id]?.name ?? '(Unknown)';
}

// team name a manager used in a given season
function seasonTeamNameForManager(season, managerId) {
  return season.records.find(r => r.managerId === managerId)?.teamName ?? '(Unknown team)';
}

// e.g. "Bengals (Liam)" for the champ line on the seasons list
function seasonChampionLabel(season) {
  const team = seasonTeamNameForManager(season, season.championManagerId);
  const mgr = managerName(season.championManagerId);
  return `${team} (${mgr})`;
}

function seasonRunnerUpLabel(season) {
  const team = seasonTeamNameForManager(season, season.runnerUpManagerId);
  const mgr = managerName(season.runnerUpManagerId);
  return `${team} (${mgr})`;
}

function seasonThirdPlaceLabel(season) {
  const team = seasonTeamNameForManager(season, season.thirdplaceManagerId);
  const mgr = managerName(season.thirdplaceManagerId);
  return `${team} (${mgr})`;
}

function seasonBellaLabel(season) {
  const id = season.bellaManagerId;       // your JSON field
  if (!id) return '(N/A)';                // handles empty string
  const team = seasonTeamNameForManager(season, id);
  const mgr = managerName(id);
  return `${team} (${mgr})`;
}

function fmt2(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : '0.00';
}

// Sum all seasons per manager
function computeAllTimeRows(league) {
  const byManager = {}; // managerId -> totals

  for (const season of league.seasons) {
    const present = new Set();

    for (const r of season.records) {
      const id = r.managerId;
      if (!byManager[id]) {
        byManager[id] = {
          managerId: id,
          wins: 0, losses: 0, ties: 0,
          pf: 0, pa: 0,
          playoffApps: 0,
          champs: 0, runnerUps: 0, thirds: 0, bellas: 0,
          seasons: 0,
          winPct: 0, diff: 0,
        };
      }
      byManager[id].wins += r.wins ?? 0;
      byManager[id].losses += r.losses ?? 0;
      byManager[id].ties += r.ties ?? 0;
      byManager[id].pf += r.pointsFor ?? 0;
      byManager[id].pa += r.pointsAgainst ?? 0;
      byManager[id].playoffApps += r.playoffApp ? 1 : 0;
      present.add(id);
    }

    // season awards (IDs are required in the data)
    if (season.championManagerId) {
      byManager[season.championManagerId] ??= { managerId: season.championManagerId, wins:0,losses:0,ties:0,pf:0,pa:0,playoffApps:0,champs:0,runnerUps:0,thirds:0,seasons:0,winPct:0,diff:0 };
      byManager[season.championManagerId].champs += 1;
    }
    if (season.runnerUpManagerId) {
      byManager[season.runnerUpManagerId] ??= { managerId: season.runnerUpManagerId, wins:0,losses:0,ties:0,pf:0,pa:0,playoffApps:0,champs:0,runnerUps:0,thirds:0,seasons:0,winPct:0,diff:0 };
      byManager[season.runnerUpManagerId].runnerUps += 1;
    }
    if (season.thirdplaceManagerId) {
      byManager[season.thirdplaceManagerId] ??= { managerId: season.thirdplaceManagerId, wins:0,losses:0,ties:0,pf:0,pa:0,playoffApps:0,champs:0,runnerUps:0,thirds:0,seasons:0,winPct:0,diff:0 };
      byManager[season.thirdplaceManagerId].thirds += 1;
    }
    if (season.bellaManagerId) {
      const id = season.bellaManagerId;
      byManager[id] ??= { managerId: id, wins:0, losses:0, ties:0, pf:0, pa:0, playoffApps:0,
        champs:0, runnerUps:0, thirds:0, bellas:0, seasons:0, winPct:0, diff:0 };
      byManager[id].bellas += 1;
    }

    // count a season for each manager who appeared this year
    present.forEach(id => { byManager[id].seasons += 1; });
  }

  // finalize derived fields
  for (const row of Object.values(byManager)) {
    row.diff = row.pf - row.pa;
    const gp = row.wins + row.losses + row.ties;
    row.winPct = gp ? (row.wins + 0.5 * row.ties) / gp : 0;
  }
  return Object.values(byManager);
}

// sorting helpers
function atSortValue(key, r) {
  switch (key) {
    case 'manager':   return managerName(r.managerId).toLowerCase();
    case 'wins':      return r.wins;
    case 'losses':    return r.losses;        // lower is better (we'll invert dir by default)
    case 'ties':      return r.ties;
    case 'winPct':    return r.winPct;
    case 'pf':        return r.pf;
    case 'pa':        return r.pa;            // lower is better
    case 'diff':      return r.diff;
    case 'playoffApps': return r.playoffApps;
    case 'champs':    return r.champs;
    case 'runnerUps': return r.runnerUps;
    case 'thirds':    return r.thirds;
    case 'seasons':   return r.seasons;
    case 'bellas':    return r.bellas;
    default:          return 0;
  }
}
function makeComparer(sort) {
  return (a, b) => {
    const va = atSortValue(sort.key, a);
    const vb = atSortValue(sort.key, b);
    if (va < vb) return sort.dir === 'asc' ? -1 : 1;
    if (va > vb) return sort.dir === 'asc' ?  1 : -1;
    // tie-breakers
    return (b.wins - a.wins) || (a.losses - b.losses) || ((b.pf ?? 0) - (a.pf ?? 0));
  };
}
function defaultDirFor(key) {
  // sensible defaults: numbers usually descending, except lower-is-better columns
  return (key === 'losses' || key === 'pa') ? 'asc' : 'desc';
}

function findSeason(year) {
  return league.seasons.find(s => String(s.year) === String(year)) || null;
}

function winPct(r) {
  const gp = r.wins + r.losses + r.ties;
  return gp ? (r.wins + 0.5 * r.ties) / gp : 0;
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.4 }}>
      {/* tiny nav */}
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/all-time">All-Time</Link>
        <Link to="/seasons">Seasons</Link>
      </nav>

      {/* where pages render */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/all-time" element={<AllTimePage />} />
        <Route path="/seasons" element={<SeasonsPage />} />
        <Route path="/seasons/:year" element={<SeasonPage />} />
        <Route path="/manager/:id" element={<ManagerPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

/* --- tiny placeholder pages for now --- */
function HomePage() {
  return (
    <>
      <h1>Welcome to the XFL Archive</h1>
      <p>Click me buttons matey</p>
    </>
  )
}

function AllTimePage() {
  const [sort, setSort] = useState({ key: 'wins', dir: 'desc' });
  const rows = computeAllTimeRows(league).sort(makeComparer(sort));

  const headers = [
    ['manager',    'Manager'],
    ['seasons',    'Seasons'],
    ['wins',       'W'],
    ['losses',     'L'],
    ['ties',       'T'],
    ['winPct',     'Win%'],
    ['pf',         'PF'],
    ['pa',         'PA'],
    ['diff',       'Diff'],
    ['playoffApps','PO Apps'],
    ['champs',     'Champs'],
    ['runnerUps',  '2nd'],
    ['thirds',     '3rd'],
    ['bellas', 'Bellas'],
  ];

  function arrow(key) {
    return sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  }
  function handleSort(key) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: defaultDirFor(key) }
    );
  }

  return (
    <>
      <h1>All-Time Records</h1>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {headers.map(([key, label]) => (
                <th key={key} style={{ textAlign: key === 'manager' ? 'left' : 'right', padding: '6px 8px', borderBottom: '1px solid #ddd' }}>
                  <button
                    onClick={() => handleSort(key)}
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
                  >
                    {label}{arrow(key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.managerId}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                  <Link to={`/manager/${r.managerId}`}>{managerName(r.managerId)}</Link>
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.seasons}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.wins}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.losses}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.ties}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {r.winPct.toFixed(3)}
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt2(r.pf)}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt2(r.pa)}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt2(r.diff)}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.playoffApps}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.champs}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.runnerUps}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.thirds}</td>
                <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee', textAlign:'right' }}>{r.bellas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SeasonsPage() {
  const seasons = [...league.seasons].sort((a, b) => b.year - a.year);
  return (
    <>
      <h1>Seasons</h1>
      <ul>
        {seasons.map((s) => (
          <li key={s.year} style={{ margin: '8px 0' }}>
            <Link to={`/seasons/${s.year}`}>{s.year}</Link>
            {' '}- <b>Champ:</b> {seasonChampionLabel(s)}
            {' '}| <b>2nd:</b> {seasonRunnerUpLabel(s)}
            {' '}| <b>3rd:</b> {seasonThirdPlaceLabel(s)}
            {' '}| <b>Bella:</b> {seasonBellaLabel(s)}
          </li>
        ))}
      </ul>
    </>
  );
}

function SeasonPage() {
  const { year } = useParams();
  const season = league.seasons.find(s => String(s.year) === String(year)) || null;

  // sort state: key + direction
  const [sort, setSort] = useState({ key: 'wins', dir: 'desc' });

  if (!season) {
    return (
      <>
        <h1>Season {year}</h1>
        <p>Not found.</p>
        <p><Link to="/seasons">Back to seasons</Link></p>
      </>
    );
  }

  // helpers local to this page so we don't clash with any you already made
  function winPctFor(r) {
    const w = r.wins ?? 0, l = r.losses ?? 0, t = r.ties ?? 0;
    const gp = w + l + t;
    return gp ? (w + 0.5 * t) / gp : 0;
  }
  function labelFor(r) {
    return `${r.teamName} (${managerName(r.managerId)})`;
  }
  function diffFor(r) {
    return (r.pointsFor ?? 0) - (r.pointsAgainst ?? 0);
  }
  function sortValue(key, r) {
    switch (key) {
      case 'team':   return `${r.teamName ?? ''} (${managerName(r.managerId)})`.toLowerCase();
      case 'wins':   return r.wins ?? 0;
      case 'losses': return r.losses ?? 0;
      case 'ties':   return r.ties ?? 0;
      case 'winPct': return winPctFor(r);
      case 'pf':     return r.pointsFor ?? 0;
      case 'pa':     return r.pointsAgainst ?? 0;
      case 'diff':   return diffFor(r);
      default:       return 0;
    }
  }
  function compare(a, b) {
    const va = sortValue(sort.key, a);
    const vb = sortValue(sort.key, b);
    if (va < vb) return sort.dir === 'asc' ? -1 : 1;
    if (va > vb) return sort.dir === 'asc' ? 1 : -1;
    // tie-breakers: W desc, L asc, PF desc
    return (b.wins - a.wins) || (a.losses - b.losses) || ((b.pointsFor ?? 0) - (a.pointsFor ?? 0));
  }
  function arrow(key) {
    return sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  }
  function handleSort(key) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : // sensible defaults: numbers usually desc, except losses/PA (lower is better)
          { key, dir: (key === 'losses' || key === 'pa') ? 'asc' : 'desc' }
    );
  }

  const rows = season.records.slice().sort(compare);

  return (
    <>
      <h1>Season {season.year}</h1>

      <p style={{ margin: '8px 0' }}>
        <strong>Champion:</strong> {seasonChampionLabel(season)}
        {'  '}|{'  '}<strong>Runner-Up:</strong> {seasonRunnerUpLabel(season)}
        {'  '}|{'  '}<strong>3rd:</strong> {seasonThirdPlaceLabel(season)}
        {'  '}|{'  '}<strong>Bella:</strong> {seasonBellaLabel(season)}
      </p>

      {season.notes ? <p style={{ marginBottom: 16 }}>{season.notes}</p> : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              {[
                ['team',   'Team (Manager)'],
                ['wins',   'W'],
                ['losses', 'L'],
                ['ties',   'T'],
                ['winPct', 'Win%'],
                ['pf',     'PF'],
                ['pa',     'PA'],
                ['diff',   'Diff'],
                ['po',     'PO']
              ].map(([key, label]) => (
                <th key={key} style={{ textAlign: key==='team' ? 'left' : key==='po' ? 'center' : 'right', padding: '6px 8px', borderBottom: '1px solid #ddd' }}>
                  {key === 'po' ? (
                    label
                  ) : (
                    <button
                      onClick={() => handleSort(key)}
                      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
                    >
                      {label}{arrow(key)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.managerId}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>{r.teamName} (<Link to={`/manager/${r.managerId}`}>{managerName(r.managerId)}</Link>)</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>{r.wins}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>{r.losses}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>{r.ties}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {winPctFor(r).toFixed(3)}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>{fmt2(r.pointsFor)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>{fmt2(r.pointsAgainst)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>{fmt2(diffFor(r))}</td>
                <td style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid #eee' }}>
                  {r.playoffApp ? '✓' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12 }}>
        <Link to="/seasons">← Back to seasons</Link>
      </p>
    </>
  );
}

function ManagerPage() {
  const { id } = useParams();

  // basic lookups
  const name = managerName(id);
  const seasonsWithThisManager = league.seasons
    .filter(s => s.records.some(r => r.managerId === id))
    .map(s => ({
      season: s,
      rec: s.records.find(r => r.managerId === id)
    }))
    .sort((a, b) => b.season.year - a.season.year);

  // pull the all-time row we already compute for consistency
  const allTimeRow = computeAllTimeRows(league).find(r => r.managerId === id) || {
    managerId: id, seasons: 0, wins: 0, losses: 0, ties: 0,
    pf: 0, pa: 0, diff: 0, winPct: 0, playoffApps: 0, champs: 0, runnerUps: 0, thirds: 0, bellas: 0
  };

  return (
    <>
      <h1>{name}</h1>

      {/* summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, margin:'12px 0 16px' }}>
        <Stat label="Seasons" value={allTimeRow.seasons} />
        <Stat label="W-L-T" value={`${allTimeRow.wins}-${allTimeRow.losses}-${allTimeRow.ties}`} />
        <Stat label="Win%" value={allTimeRow.winPct.toFixed(3)} mono />
        <Stat label="PF" value={fmt2(allTimeRow.pf)} />
        <Stat label="PA" value={fmt2(allTimeRow.pa)} />
        <Stat label="Diff" value={fmt2(allTimeRow.diff)} />
        <Stat label="PO Apps" value={allTimeRow.playoffApps} />
        <Stat label="Champs" value={allTimeRow.champs} />
        <Stat label="2nd" value={allTimeRow.runnerUps} />
        <Stat label="3rd" value={allTimeRow.thirds} />
        <Stat label="Bellas" value={allTimeRow.bellas} />
      </div>

      {/* season-by-season table */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', minWidth:720 }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left',  padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Year</th>
              <th style={{ textAlign:'left',  padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Team Name</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>W</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>L</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>T</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Win%</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>PF</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>PA</th>
              <th style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Diff</th>
              <th style={{ textAlign:'center',padding:'6px 8px', borderBottom:'1px solid #ddd' }}>PO</th>
              <th style={{ textAlign:'left',  padding:'6px 8px', borderBottom:'1px solid #ddd' }}>Awards</th>
            </tr>
          </thead>
          <tbody>
            {seasonsWithThisManager.map(({ season, rec }) => {
              const pct = (() => {
                const w = rec.wins ?? 0, l = rec.losses ?? 0, t = rec.ties ?? 0;
                const gp = w + l + t;
                return gp ? (w + 0.5 * t) / gp : 0;
              })();
              const diff = (rec.pointsFor ?? 0) - (rec.pointsAgainst ?? 0);

              const awards = [];
              if (season.championManagerId === id) awards.push('Champ');
              if (season.runnerUpManagerId === id) awards.push('Runner-Up');
              if (season.thirdplaceManagerId === id) awards.push('3rd');
              if (season.bellaManagerId === id) awards.push('Bella');

              return (
                <tr key={season.year}>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>
                    <Link to={`/seasons/${season.year}`}>{season.year}</Link>
                  </td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>
                    {rec.teamName}
                  </td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{rec.wins}</td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{rec.losses}</td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{rec.ties}</td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee', fontFamily:'ui-monospace, Menlo, monospace' }}>
                    {pct.toFixed(3)}
                  </td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{fmt2(rec.pointsFor)}</td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{fmt2(rec.pointsAgainst)}</td>
                  <td style={{ textAlign:'right', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{fmt2(diff)}</td>
                  <td style={{ textAlign:'center', padding:'6px 8px', borderBottom:'1px solid #eee' }}>{rec.playoffApp ? '✓' : '—'}</td>
                  <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{awards.join(', ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12 }}>
        <Link to="/all-time">← Back to All-Time</Link>
      </p>
    </>
  );
}

// tiny stat chip
function Stat({ label, value, mono }) {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:'8px 10px', background:'#fff' }}>
      <div style={{ fontSize:12, color:'#64748b', textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:600, fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit' }}>{value}</div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <>
      <h1>Not found</h1>
      <p>That page doesn’t exist.</p>
    </>
  )
}