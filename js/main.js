// Weekly quote rotation — same quote all week, changes each Sunday
const quotes = [
  {
    text: "A man has to live with himself, and he should see to it that he always has good company.",
    author: "Charles Evans Hughes",
    title: "Chief Justice of the United States · Zeta Psi, 1881"
  },
  {
    text: "Government, in the last analysis, is organized opinion. Where there is little or no public opinion, there is likely to be bad government.",
    author: "William Lyon Mackenzie King",
    title: "Prime Minister of Canada · Zeta Psi, 1895"
  },
  {
    text: "The test of leadership is not to put greatness into humanity, but to elicit it, for the greatness is already there.",
    author: "Ben Bradlee",
    title: "Executive Editor, The Washington Post · Zeta Psi, 1943"
  },
  {
    text: "The secret of success is to do the common thing uncommonly well.",
    author: "DeWitt Wallace",
    title: "Co-Founder, Reader's Digest · Zeta Psi, 1911"
  },
  {
    text: "Hard work and dedication open doors that talent alone never could.",
    author: "Kiefer Sutherland",
    title: "Actor & Producer · Zeta Psi"
  },
  {
    text: "Brotherhood means being there when it's inconvenient, when it's difficult, and when it matters most.",
    author: "Alan Thicke",
    title: "Actor, Songwriter & Television Host · Zeta Psi"
  },
  {
    text: "Character is not made in a crisis — it is only exhibited there.",
    author: "Robert Freeman",
    title: "Theologian & Author · Zeta Psi"
  }
];

function loadWeeklyQuote() {
  const el = document.getElementById('weekly-quote');
  const authorEl = document.getElementById('quote-author');
  if (!el || !authorEl) return;

  // Week number since Unix epoch — same quote the entire week
  const weekIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)) % quotes.length;
  const q = quotes[weekIndex];

  el.textContent = q.text;
  authorEl.innerHTML = `<strong>${q.author}</strong><br><span>${q.title}</span>`;
}

// Mobile nav toggle
function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', links.classList.contains('open'));
  });

  // Close nav when a link is clicked
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// Mark the active nav link based on current page filename
function markActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadWeeklyQuote();
  initNavToggle();
  markActiveNav();
});
