/**
 * China visa checker.
 *
 * Imports the same rules module the site is built from, so the interactive
 * answer and the static table below it can never disagree. No network calls,
 * no dependencies — everything runs from the imported data.
 */
import { resolve, SCHEMES, PERMITTED_PROVINCES_240H, EXCLUDED_FROM_240H, LAST_REVIEWED } from './visa-rules.js';

const form = document.getElementById('visa-form');
const output = document.getElementById('visa-result');
if (form && output) {
  const fields = {
    country: document.getElementById('visa-country'),
    purpose: document.getElementById('visa-purpose'),
    days: document.getElementById('visa-days'),
    onward: document.getElementById('visa-onward'),
    hainan: document.getElementById('visa-hainan'),
  };

  const escape = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const list = (items) => `<ul>${items.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`;

  function readForm() {
    return {
      country: fields.country.value,
      purpose: fields.purpose.value,
      days: Number(fields.days.value) || 1,
      onwardThirdCountry: fields.onward.checked,
      hainanOnly: fields.hainan.checked,
    };
  }

  /** Results are shareable: the whole answer lives in the URL hash. */
  function writeHash(input) {
    const params = new URLSearchParams({
      c: input.country,
      p: input.purpose,
      d: String(input.days),
      t: input.onwardThirdCountry ? '1' : '0',
      h: input.hainanOnly ? '1' : '0',
    });
    history.replaceState(null, '', `#${params}`);
  }

  function readHash() {
    if (!location.hash) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    if (!params.get('c')) return null;
    fields.country.value = params.get('c');
    fields.purpose.value = params.get('p') || 'tourism';
    fields.days.value = params.get('d') || '14';
    fields.onward.checked = params.get('t') === '1';
    fields.hainan.checked = params.get('h') === '1';
    return readForm();
  }

  function render(input) {
    if (!input.country) {
      output.innerHTML = '<p class="visa-result__empty">Choose a passport to see which entry route applies.</p>';
      return;
    }

    const { primary, alternatives, warnings, country } = resolve(input);
    const needsVisa = primary.id === 'visaL';

    const geography =
      primary.geography === 'permittedProvinces'
        ? `<p class="visa-result__geo"><strong>Where you may go:</strong> ${PERMITTED_PROVINCES_240H.join(', ')}. Outside the scheme: ${EXCLUDED_FROM_240H.join(', ')}.</p>`
        : '';

    output.innerHTML = `
      <div class="visa-result ${needsVisa ? 'visa-result--visa' : 'visa-result--free'}">
        <p class="visa-result__verdict">
          ${needsVisa ? 'You need a visa' : 'No visa needed'}
          <span>${escape(country.name)} passport · ${input.days} night${input.days === 1 ? '' : 's'}</span>
        </p>
        <h3>${escape(primary.label)}</h3>
        <p>${escape(primary.summary)}</p>
        <h4>What you need</h4>
        ${list(primary.requires)}
        ${geography}
        <h4>Watch out for</h4>
        ${list(primary.caveats)}
        ${country.note ? `<p class="visa-result__note">${escape(country.note)}</p>` : ''}
        ${
          warnings.length
            ? `<div class="visa-result__warnings"><p><strong>Also worth knowing</strong></p>${list(warnings)}</div>`
            : ''
        }
        ${
          alternatives.length
            ? `<p class="visa-result__alt">Other routes open to a ${escape(country.name)} passport: ${alternatives
                .map((s) => escape(s.short))
                .join(', ')}.</p>`
            : ''
        }
        <p class="visa-result__footer">
          Rules last reviewed ${escape(LAST_REVIEWED)}. Indicative only — confirm with the Chinese
          embassy before booking. <a href="/guides/china-visa-guide/">Read the full visa guide</a>.
        </p>
      </div>`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = readForm();
    writeHash(input);
    render(input);
    output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Live update as soon as a passport is picked — no need to hunt for the button.
  for (const field of Object.values(fields)) {
    field.addEventListener('change', () => {
      const input = readForm();
      if (input.country) {
        writeHash(input);
        render(input);
      }
    });
  }

  const fromHash = readHash();
  if (fromHash) render(fromHash);
  else render({ country: '' });

  // Pasting a shared link while already on the page changes the hash without
  // reloading, so re-read it rather than leaving a stale answer on screen.
  window.addEventListener('hashchange', () => {
    const shared = readHash();
    if (shared) render(shared);
  });

  // Expose the scheme list for anyone inspecting the page. Harmless, and useful.
  window.__visaSchemes = SCHEMES;
}
