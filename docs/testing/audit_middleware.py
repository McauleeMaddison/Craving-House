"""Opt-in local accessibility harness; never add to production settings.

Set AXE_CORE_PATH to the extracted official axe-core 4.13.0 axe.min.js file.
"""
import os
from pathlib import Path
from django.conf import settings
from django.http import HttpResponse

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)
        if request.path == '/__assessment__/axe.min.js':
            return HttpResponse(Path(os.environ.get('AXE_CORE_PATH', '/tmp/craving-audit/package/axe.min.js')).read_bytes(), content_type='application/javascript')
        response = self.get_response(request)
        if response.get('Content-Type', '').startswith('text/html'):
            for asset in ['django/css/app.css', 'django/js/app.js']:
                stamp = str(Path('static', asset).stat().st_mtime_ns)
                response.content = response.content.replace(("/static/" + asset + chr(34)).encode(), ("/static/" + asset + "?v=" + stamp + chr(34)).encode())
        if request.GET.get('audit') == '1' and response.get('Content-Type', '').startswith('text/html'):
            script = b'''<script src="/__assessment__/axe.min.js"></script><script>
            window.addEventListener('load', () => setTimeout(async () => {
              const results = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','best-practice']}});
              const output = document.createElement('pre'); output.id = 'assessment-audit'; output.hidden = true;
              output.textContent = JSON.stringify(results); document.body.appendChild(output);
            }, 500));</script>'''
            response.content = response.content.replace(b'</body>', script + b'</body>')
        if response.get('Content-Type', '').startswith('text/html'):
            response['Content-Length'] = str(len(response.content))
        return response
