/* China Trip Compass — progressive enhancement only. The site works without it. */
(function () {
  'use strict';

  /* ---------------------------------------------------------- mobile nav */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  /* ------------------------------------------------------- search index */
  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/search-index.json')
        .then(function (r) { return r.json(); })
        .catch(function () { return []; });
    }
    return indexPromise;
  }

  function score(doc, terms) {
    var title = doc.t.toLowerCase();
    var desc = (doc.d || '').toLowerCase();
    var blob = doc.k || '';
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var hit = 0;
      if (title.indexOf(term) !== -1) hit += 12;
      if (title.indexOf(term) === 0) hit += 6;
      if (desc.indexOf(term) !== -1) hit += 4;
      if (blob.indexOf(term) !== -1) hit += 1;
      if (!hit) return 0;
      total += hit;
    }
    return total;
  }

  function search(docs, query) {
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return docs
      .map(function (d) { return { doc: d, s: score(d, terms) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (r) { return r.doc; });
  }

  /* ------------------------------------------------- header quick search */
  var headerForm = document.querySelector('.site-search');
  if (headerForm) {
    var input = headerForm.querySelector('input[type="search"]');
    var panel = headerForm.querySelector('.site-search__results');

    var render = function (results) {
      if (!results.length) {
        panel.innerHTML = '<p>No matches. Try “visa”, “train” or “Alipay”.</p>';
        panel.hidden = false;
        return;
      }
      panel.innerHTML = results
        .slice(0, 8)
        .map(function (d) {
          return '<a href="' + d.u + '">' + d.t + '<small>' + (d.s || '') + '</small></a>';
        })
        .join('');
      panel.hidden = false;
    };

    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) { panel.hidden = true; return; }
      timer = setTimeout(function () {
        loadIndex().then(function (docs) { render(search(docs, q)); });
      }, 120);
    });

    document.addEventListener('click', function (e) {
      if (!headerForm.contains(e.target)) panel.hidden = true;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { panel.hidden = true; input.blur(); }
    });
  }

  /* --------------------------------------------------------- search page */
  var pageInput = document.getElementById('search-input');
  var pageResults = document.getElementById('search-results');
  if (pageInput && pageResults) {
    var show = function (query) {
      if (!query || query.length < 2) {
        pageResults.innerHTML = '';
        return;
      }
      loadIndex().then(function (docs) {
        var results = search(docs, query);
        if (!results.length) {
          pageResults.innerHTML = '<p>Nothing matched “' + query.replace(/[<>&]/g, '') + '”.</p>';
          return;
        }
        pageResults.innerHTML = results
          .map(function (d) {
            return (
              '<article><small>' + (d.s || '') + '</small>' +
              '<h2><a href="' + d.u + '">' + d.t + '</a></h2>' +
              '<p>' + (d.d || '') + '</p></article>'
            );
          })
          .join('');
      });
    };

    var initial = new URLSearchParams(location.search).get('q');
    if (initial) { pageInput.value = initial; show(initial); }
    pageInput.addEventListener('input', function () { show(pageInput.value.trim()); });
  }

  /* ------------------------------------------------------- TOC highlight */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (link) link.style.color = entry.isIntersecting ? 'var(--red)' : '';
        });
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

})();
