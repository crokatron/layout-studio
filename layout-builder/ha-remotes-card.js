/* HA-local remote dashboard. All controls use the current HA app session. */

(() => {

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const introApps = {'com.netflix.ninja':'Netflix','com.netflix.mediaclient':'Netflix','com.amazon.amazonvideo.livingroom':'Prime Video','com.amazon.avod.thirdpartyclient':'Prime Video','com.plexapp.android':'Plex','com.crunchyroll.crunchyroid':'Crunchyroll'};

  class MungoonMediaRemotes extends HTMLElement {

    constructor() { super(); this.attachShadow({mode:'open'}); this.index=0; this.native=[]; this.epoch=0; }

    setConfig(config) { this.config=config; this.index=Math.min(this.index,Math.max(0,(config.pages||[]).length-1)); this.render(); }

    set hass(value) { this._hass=value; this.update(); }

    getCardSize() { return 8; }

    change(index, focus=false) {

      const n=(this.config.pages||[]).length;

      if(index<0 || index>=n || index===this.index)return;

      this.index=index; this.render();

      const tab=this.shadowRoot.querySelector('[aria-selected="true"]');

      tab?.scrollIntoView({block:'nearest',inline:'nearest'}); if(focus)tab?.focus();

    }

    render() {

      if(!this.config)return;

      const pages=this.config.pages||[], p=pages[this.index], root=this.shadowRoot;

      this.native=[]; const epoch=++this.epoch; this.gesture=null;

      root.innerHTML=`<style>

        :host{display:block;container-type:inline-size;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,system-ui);--accent:var(--primary-color,#2196f3)}

        *{box-sizing:border-box} .wrap{max-width:1000px;margin:auto;padding:20px 24px 32px}h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:0}h3{font-size:16px;margin:0 0 5px}p{line-height:1.5}.muted{color:var(--secondary-text-color);font-size:14px}.head{margin-bottom:20px}

        nav{display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px;scrollbar-width:thin}button,a{font:inherit}button{cursor:pointer;color:inherit;border:1px solid var(--divider-color,#bbc);background:var(--card-background-color,#fff);border-radius:14px;min-height:48px;padding:10px 16px}button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}button:active:not(:disabled){transform:scale(.96)}button:disabled{opacity:.4;cursor:default}

        [role=tab]{white-space:nowrap;min-width:110px;text-align:left}[aria-selected=true]{border-color:var(--accent);background:var(--primary-color,#2196f3);color:var(--text-primary-color,#fff)}

        .page{touch-action:pan-y;min-height:360px}.pagehead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 18px}.arrows{display:flex;gap:6px}.arrows button{padding:8px;min-width:44px;min-height:44px}.grid{display:grid;grid-template-columns:minmax(270px,340px) minmax(280px,1fr);gap:24px;align-items:start}.panel{border:1px solid var(--divider-color,#bbc);border-radius:24px;background:var(--card-background-color,#fff);padding:20px;min-width:0}.remote{max-width:310px;width:100%;justify-self:center}.status{min-height:22px;margin:4px 0 16px}.power{display:flex;justify-content:space-between;gap:10px;margin-bottom:20px}.power button{flex:1}.dpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:var(--secondary-background-color,#eee);border-radius:50%;padding:12px;margin:0 auto 16px;max-width:216px}.dpad button{border-radius:50%;aspect-ratio:1;padding:0;min-width:48px;font-size:25px}.dpad .ok{font-size:17px;font-weight:700;border-color:var(--accent)}.empty{visibility:hidden}.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.keys button{padding:10px 4px;font-size:13px;min-height:56px}.keys ha-icon{display:block;margin:auto auto 3px;--mdc-icon-size:22px}.side{display:grid;gap:18px}.native{margin-top:16px}.native>*{display:block;margin-top:12px} .msg{min-height:22px;margin:12px 0;color:var(--secondary-text-color);font-size:14px}.msg.error{color:var(--error-color,#c33)}.links{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.links a,.setup{color:var(--accent);padding:10px 0;display:inline-block;min-height:44px}.counter{font-size:12px;color:var(--secondary-text-color);margin-right:8px}.soundbar-art{height:32px;border-radius:8px;background:linear-gradient(135deg,#373d43,#14171b);margin:16px 0 4px;position:relative}.soundbar-art:after{content:'';position:absolute;right:20px;top:14px;width:18px;height:3px;background:#abd9ff}.hint{font-size:13px;color:var(--secondary-text-color);margin:6px 0 0}

        @container(max-width:680px){.wrap{padding:14px 12px 24px}.grid{grid-template-columns:1fr;gap:16px}.side{width:100%;max-width:430px;justify-self:center}.remote{max-width:320px}.panel{padding:18px}.pagehead{margin-bottom:12px}h1{font-size:24px}.head{margin-bottom:12px}.dpad{max-width:204px}.keys button{min-height:52px}}



        /* BEGIN COMPACT MOBILE REMOTES */

        @container(max-width:680px){

          .wrap{padding:6px 8px 20px}.head,.pagehead{display:none}

          nav{padding:0 0 8px;gap:6px}nav button{min-height:44px;padding:8px 12px}

          .remote{padding:12px 14px;border-radius:20px;display:grid;grid-template-columns:auto 1fr;column-gap:8px}

          .remote h3{font-size:15px;margin:0;align-self:center}

          .remote .status{min-height:0;margin:0;text-align:right;font-size:12px;align-self:center}

          .remote .power,.remote .dpad,.remote .keys{grid-column:1/-1}

          .remote .power{margin:10px 0 12px}.remote .power button{min-height:44px;padding:8px}

          .remote .dpad{width:204px;margin:0 auto 8px;padding:10px;gap:6px}

          .remote .keys{margin-top:0;gap:6px}.remote .keys button{min-height:48px;padding:6px 3px}

          .remote .keys ha-icon{--mdc-icon-size:20px;margin-bottom:2px}

          .msg:empty{display:none}

        }

        /* END COMPACT MOBILE REMOTES */

        .intro{grid-column:1/-1;margin-top:8px}.intro button{width:100%;min-height:44px;padding:8px;border-color:var(--accent)}.intro small{display:block;font-size:11px;line-height:1.35;color:var(--secondary-text-color);margin-top:5px}.intro [hidden]{display:none}

      </style><div class="wrap"><header class="head"><h1>Remotes</h1><div class="muted">TV and sound, together.</div></header>

      <nav role="tablist" aria-label="TV rooms">${pages.map((x,i)=>`<button role="tab" id="remote-tab-${i}" aria-controls="remote-page" aria-selected="${i===this.index}" tabindex="${i===this.index?0:-1}" data-page="${i}">${esc(x.name)}</button>`).join('')}</nav>

      ${p?`<section class="page" id="remote-page" role="tabpanel" aria-labelledby="remote-tab-${this.index}"><div class="pagehead"><div><h2>${esc(p.name)}</h2><p class="hint">Swipe here or choose a room above</p></div><div class="arrows"><span class="counter">${this.index+1} / ${pages.length}</span><button aria-label="Previous TV" data-step="-1" ${this.index===0?'disabled':''}>‹</button><button aria-label="Next TV" data-step="1" ${this.index===pages.length-1?'disabled':''}>›</button></div></div><div class="grid">

      ${p.remote?this.remote(p.remote):`<article class="panel"><h3>TV controls</h3><p class="muted">Pair Android TV Remote to add the navigation pad for this TV.</p><a class="setup" href="/config/integrations/dashboard">Set up in HA</a><div class="native" data-native="tv"></div></article>`}

      <div class="side">${p.soundbar?`<article class="panel"><h3>Samsung soundbar</h3><div class="muted">${esc(p.soundbar.model||p.soundbar.name)}</div><div class="soundbar-art" aria-hidden="true"></div><div class="native" data-native="soundbar"></div></article>`:''}${p.remote&&p.media?.length?'<article class="panel"><h3>TV playback</h3><div class="native" data-native="tv"></div></article>':''}</div></div></section>`:'<p>No TVs found. Add a TV integration in HA, then refresh HA in Layout Studio.</p>'}

      <p class="msg" role="status" aria-live="polite"></p><footer class="links"><a href="https://example.invalid/floor-plan/#automations" target="_blank" rel="noopener">Easy Automations ↗</a><a href="https://example.invalid/floor-plan/#buttons" target="_blank" rel="noopener">Easy Buttons ↗</a></footer></div>`;

      root.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>this.change(Number(b.dataset.page)));

      root.querySelector('nav').onkeydown=e=>{const next=e.key==='ArrowRight'?this.index+1:e.key==='ArrowLeft'?this.index-1:e.key==='Home'?0:e.key==='End'?pages.length-1:null;if(next!==null){e.preventDefault();this.change(next,true);}};

      root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>this.change(this.index+Number(b.dataset.step)));

      root.querySelectorAll('[data-command],[data-power]').forEach(b=>b.onclick=()=>this.send(b,p.remote.entity));

      const intro=root.querySelector('[data-intro]');if(intro)intro.onclick=()=>this.skipIntro(p.remote.entity);

      const surface=root.querySelector('.page');

      if(surface){

        surface.onpointerdown=e=>{if(!e.isPrimary){this.gesture=null;return;}if(e.pointerType==='mouse'||e.composedPath().some(n=>n.matches?.('button,a,input,select,.native')))return;this.gesture={id:e.pointerId,x:e.clientX,y:e.clientY};};

        surface.onpointerup=e=>{const g=this.gesture;this.gesture=null;if(g?.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.6)this.change(this.index+(dx<0?1:-1));};

        surface.onpointercancel=()=>{this.gesture=null;};

      }

      this.update(); if(p)this.mountNative(p,epoch);

    }

    remote(remote) {

      const key=(label,icon,command,cls='')=>`<button class="${cls}" aria-label="${esc(label)}" title="${esc(label)}" data-command="${command}">${cls==='ok'?'OK':`<ha-icon icon="mdi:${icon}"></ha-icon>`}</button>`;

      const keyText=(label,icon,cmd)=>`<button data-command="${cmd}"><ha-icon icon="mdi:${icon}"></ha-icon>${label}</button>`;

      return `<article class="panel remote"><h3>Android TV</h3><p class="muted status" data-status></p><div class="power"><button data-power="turn_on">Power on</button><button data-power="turn_off">Power off</button></div><div class="dpad"><span class="empty"></span>${key('Up','chevron-up','DPAD_UP')}<span class="empty"></span>${key('Left','chevron-left','DPAD_LEFT')}${key('OK','circle-small','DPAD_CENTER','ok')}${key('Right','chevron-right','DPAD_RIGHT')}<span class="empty"></span>${key('Down','chevron-down','DPAD_DOWN')}<span class="empty"></span></div><div class="keys">${keyText('Back','arrow-left','BACK')}${keyText('Home','home','HOME')}${keyText('Menu','menu','MENU')}${keyText('Volume −','volume-minus','VOLUME_DOWN')}${keyText('Mute','volume-mute','VOLUME_MUTE')}${keyText('Volume +','volume-plus','VOLUME_UP')}${keyText('Previous','skip-previous','MEDIA_PREVIOUS')}${keyText('Play / Pause','play-pause','MEDIA_PLAY_PAUSE')}${keyText('Next','skip-next','MEDIA_NEXT')}</div><div class="intro"><button data-intro aria-describedby="intro-hint">Skip intro · Select</button><small id="intro-hint" data-intro-hint></small></div></article>`;

    }

    async mountNative(p,epoch) {

      try{

        const helpers=await window.loadCardHelpers(); if(epoch!==this.epoch)return;

        const add=(slot,config)=>{const el=helpers.createCardElement(config);el.hass=this._hass;this.shadowRoot.querySelector(`[data-native="${slot}"]`)?.append(el);this.native.push(el);};

        if(p.soundbar){

          add('soundbar',{type:'tile',entity:p.soundbar.entity,name:'Soundbar',icon:'mdi:soundbar',features_position:'bottom',features:['media-player-volume-slider','media-player-source','media-player-sound-mode','media-player-playback'].map(type=>({type})),tap_action:{action:'more-info'}});

          if(p.soundbar.controls?.length){

            add('soundbar',{type:'entities',title:'Sound settings',show_header_toggle:false,entities:p.soundbar.controls});

            add('soundbar',{type:'markdown',content:'Sound settings show the last command accepted by Samsung. Changes from the remote or SmartThings app are not reported. Choose a setting to apply it; a blank value means it has not been set here yet.'});

          }

        }

        for(const m of p.media||[])add('tv',{type:'media-control',entity:m.entity,name:m.name});

      }catch(error){if(epoch===this.epoch)this.message('HA media controls could not load. Reload this dashboard.',true);}

    }

    update() {

      for(const el of this.native)el.hass=this._hass;

      const p=this.config?.pages?.[this.index];if(!p?.remote)return;

      const state=this._hass?.states?.[p.remote.entity], unavailable=!state||['unavailable','unknown'].includes(state.state);

      const status=this.shadowRoot.querySelector('[data-status]');if(status)status.textContent=unavailable?'Unavailable — check the TV connection':state.state==='off'?'TV is off':p.remote.model||'Connected';

      this.shadowRoot.querySelectorAll('[data-command],[data-power]').forEach(b=>b.disabled=unavailable||this.busy===p.remote.entity||(state.state==='off'&&!!b.dataset.command));

      const intro=this.shadowRoot.querySelector('[data-intro]'),hint=this.shadowRoot.querySelector('[data-intro-hint]'),app=this.introApp(p.remote.entity);

      if(intro){intro.disabled=unavailable||state.state!=='on'||!!this.busy||!app;intro.textContent=app?'Skip intro · '+app:'Skip intro · Select';}

      if(hint)hint.textContent=app?'Highlight Skip intro on the TV first. This sends OK/Select; HA cannot detect the prompt.':'Open Netflix, Prime Video, Plex or Crunchyroll on this TV. Available when HA reports the active app.';



    }

    introApp(entity) {

      const activity=this._hass?.states?.[entity]?.attributes?.current_activity;

      return introApps[String(activity||'').split('/')[0]]||null;

    }

    async skipIntro(entity) {

      const state=this._hass?.states?.[entity];

      if(this.busy||!state||state.state!=='on'||!this.introApp(entity))return;

      // The remote protocol cannot see the screen or identify intro markers.

      // Send one Select only; never infer timing or send Next Episode.

      this.busy=entity;this.update();

      try {

        await this._hass.callService('remote','send_command',{entity_id:entity,command:'DPAD_CENTER'});

        if(this.config?.pages?.[this.index]?.remote?.entity===entity)this.message('Select sent. It skips only when Skip intro is highlighted on the TV.');

      }catch(error){if(this.config?.pages?.[this.index]?.remote?.entity===entity)this.message('The TV did not accept Select. Check its connection and try again.',true);}

      finally{this.busy=null;this.update();}

    }

    message(text,error=false){const el=this.shadowRoot.querySelector('.msg');if(el){el.textContent=text;el.classList.toggle('error',error);}}

    async send(button,entity) {

      if(button.disabled||this.busy)return;

      this.busy=entity;this.update();

      try {await this._hass.callService('remote',button.dataset.power||'send_command',{entity_id:entity,...(button.dataset.command?{command:button.dataset.command}:{})});this.message('Sent to TV');}

      catch(error){this.message('The TV did not accept that command. Check its connection and try again.',true);}

      finally{this.busy=null;this.update();}

    }

  }

  if(!customElements.get('mungoon-media-remotes'))customElements.define('mungoon-media-remotes',MungoonMediaRemotes);

})();

