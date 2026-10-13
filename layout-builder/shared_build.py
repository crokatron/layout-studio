"""Offline shared assets. No SDK, private data, or dependency tree is published."""

from pathlib import Path

import json,re,posixpath

ROOT=Path(__file__).resolve().parent



def magnetism():

    vendor=ROOT/'vendor-geomagnetism';modules={}

    def include(name):

        if name in modules:return

        path=vendor/name;source=path.read_text(encoding='utf-8');modules[name]=''

        if name.endswith('.json'):source='module.exports='+json.dumps(json.loads(source),separators=(',',':'))+';'

        def dep(match):

            target=posixpath.normpath(posixpath.join(posixpath.dirname(name),match[1]))

            if not (vendor/target).is_file():target+='.js'

            if not (vendor/target).is_file():raise ValueError('Unknown dependency '+target)

            include(target);return 'require('+json.dumps(target)+')'

        modules[name]=re.sub(r"require\(['\"]([^'\"]+)['\"]\)",dep,source)

    include('index.js')

    return '/* Geomagnetism 0.2.0, MIT. '+(vendor/'LICENSE').read_text().replace('*/','* /')+' */\n(function(){const modules={'+','.join(json.dumps(k)+':function(module,exports,require){\n'+v+'\n}' for k,v in sorted(modules.items()))+'};const cache={};function require(k){if(!cache[k]){const m=cache[k]={exports:{}};modules[k](m,m.exports,require);}return cache[k].exports;}window.HomeMagnetism=require("index.js");})();'



def shared():

    license=(ROOT/'suncalc-license.txt').read_text().replace('*/','* /')

    return '\n'.join(['/* '+license+' */',*( (ROOT/f).read_text(encoding='utf-8').replace('window.SunCalc = SunCalc','window.MungoonSunCalc = SunCalc') for f in ('suncalc.js','map-camera.js','sky-model.js','sky-widget.js')),magnetism()])



def ha_bundle():

    body='\n'.join([shared(),*((ROOT/f).read_text(encoding='utf-8') for f in ('furniture-symbols.js','room-environment.js','device-room-moves.js','ha-device-mover.js','ha-floor-card.js'))])

    return (ROOT/'ha-refresh.js').read_text(encoding='utf-8')+'\nwindow.FloorPlanRefresh.start(()=>{\n'+body+'\n});\n'

