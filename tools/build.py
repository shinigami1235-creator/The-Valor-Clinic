"""Builds the site pages from tools/pages/*.html into the repo root. Run: python3 tools/build.py"""
from pathlib import Path
import hashlib
from partials import page, ICONS, SWOOSH

ROOT = Path(__file__).resolve().parent.parent
BOOK = f'''<section class="pad" style="padding-top:0"><div class="wrap"><div class="book rv-up">{SWOOSH}
<h2>Prevention is better than cure</h2>
<div class="ctas"><a class="btn btn-white" href="https://lin.ee/SUTknY5" target="_blank" rel="noopener">{ICONS["line"]}Book on LINE</a>
<a class="btn btn-ghost" style="color:#fff;box-shadow:inset 0 0 0 1.5px #fff" href="tel:022874924">{ICONS["phone"]}02-287-4924</a></div></div></div></section>'''

PAGES = {
    'index.html': ('Valor Clinic | Psoriasis, skin, heart and liver care in Sathorn, Bangkok',
                   'Valor Clinic provides comprehensive medical services in dermatology, psoriasis, liver care, cardiology, and metabolic health. Iyara Tower, Sathorn, Bangkok.', 'home.js'),
    'skin.html': ('Skin | Valor Clinic', 'Dermatology and aesthetic services by a board-certified dermatologist at Valor Clinic, Sathorn, Bangkok.', 'pages.js'),
    'metabolic-care.html': ('Metabolic Care | Valor Clinic', 'Cardio-monitoring, FibroScan liver care and weight management at Valor Clinic, Sathorn, Bangkok.', 'pages.js'),
    'about.html': ('About Valor Clinic', 'Vision and expert team of Valor Clinic, Sathorn, Bangkok.', 'pages.js'),
    'videos.html': ('Videos | Valor Clinic', 'Psoriasis, skin, heart and liver videos from the doctors at Valor Clinic.', 'pages.js'),
    'contact.html': ('Contact Us | Valor Clinic', '2/22 Iyara Tower 10th Fl., Chan Road, Sathorn, Bangkok. By appointment. 02-287-4924, LINE @valorclinic.', 'pages.js'),
}
V = hashlib.sha1(b''.join(f.read_bytes() for f in sorted((ROOT / 'js').glob('*.js')) + [ROOT / 'css/site.css'])).hexdigest()[:8]
for name, (title, desc, js) in PAGES.items():
    body = (ROOT / 'tools/pages' / name).read_text()
    for k, v in {'__SWOOSH__': SWOOSH, '__BOOK__': BOOK, '__LINE__': ICONS['line'], '__PHONE__': ICONS['phone'],
                 '__ARROW__': ICONS['arrow'], '__YT__': ICONS['yt'], '__TT__': ICONS['tt'], '__IG__': ICONS['ig'],
                 '__FB__': ICONS['fb'], '__G__': ICONS['g'], '__MSG__': ICONS['msg']}.items():
        body = body.replace(k, v)
    html = page(title, desc, name, body, f'<script type="module" src="js/{js}?v={V}"></script>', V, gsap=(js == 'home.js'))
    (ROOT / name).write_text(html)
    print('built', name)
