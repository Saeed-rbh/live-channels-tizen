/* global parsePlaylist, channelPlayer */
(function () {
  'use strict';

  var catalog = window.unifiedCatalog;
  var sources = [
    { name: 'All channels', channels: catalog },
    { name: 'Persian', channels: catalog.filter(function (c) { return c.language === 'Persian'; }) },
    { name: 'English', channels: catalog.filter(function (c) { return c.language === 'English'; }) }
  ];
  var sourceIndex = 0;
  var savedMode = '';
  var favorites = readSaved('favorites');
  var recent = readSaved('recent');
  var channels = [];
  var selectedGroup = '';
  var groupButtons = Object.create(null);
  var results = [];
  var cards = new Map();
  var rowStep = 0;
  var scrollFrame;
  var returnScroll;
  var request = null;
  var loadMessage = '';
  var returnFocus;
  var overlayTimer;

  var home = document.getElementById('home');
  var homeButtons = Array.from(home.querySelectorAll('[data-home]'));
  var homeFocus = homeButtons[0];
  var favoriteButton = document.getElementById('favorite-channel');
  var guide = document.getElementById('guide');
  var sourceNav = document.getElementById('sources');
  sources.forEach(function (source, index) {
    if (index < 3) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.dataset.source = index;
    button.textContent = source.name;
    button.setAttribute('aria-pressed', 'false');
    sourceNav.insertBefore(button, document.getElementById('reload'));
  });
  sourceNav.addEventListener('focusin', function (event) {
    event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  var sourceButtons = sourceNav.querySelectorAll('[data-source]');
  var search = document.getElementById('search');
  var status = document.getElementById('status');
  var categories = document.getElementById('categories');
  var activeSource = document.getElementById('active-source');
  var browseHeading = document.getElementById('browse-heading');
  var resultsHeading = document.getElementById('results-heading');
  var viewport = document.getElementById('channel-scroll');
  var list = document.getElementById('channels');
  var detailsEmpty = document.getElementById('details-empty');
  var detailsContent = document.getElementById('details-content');
  var detailsTitle = document.getElementById('details-title');
  var detailsLogo = document.getElementById('details-logo');
  var detailsGroup = document.getElementById('details-group');
  var watchButton = document.getElementById('watch-channel');
  var loading = document.getElementById('loading');
  var selectedIndex = 0;
  var detailChannel = null;
  var screen = document.getElementById('screen');
  var controls = document.getElementById('player-controls');
  var back = document.getElementById('back');
  var playStatus = document.getElementById('play-status');

  function readSaved(key) {
    try {
      var value = JSON.parse(localStorage.getItem('live-channels-' + key) || '[]');
      return Array.isArray(value) ? value.filter(function (channel) {
        return channel && typeof channel.name === 'string' && typeof channel.group === 'string' &&
          typeof channel.url === 'string' && /^https?:\/\//.test(channel.url);
      }).slice(0, 500) : [];
    } catch (error) { return []; }
  }

  function persist(key, value) {
    try { localStorage.setItem('live-channels-' + key, JSON.stringify(value)); }
    catch (error) { console.warn('Could not save channel collection', error); }
    updateHome();
  }

  function updateHome() {
    document.getElementById('favorite-count').textContent = favorites.length ? favorites.length + (favorites.length === 1 ? ' saved channel' : ' saved channels') : 'Save the channels you love';
    document.getElementById('recent-count').textContent = recent.length ? recent.length + (recent.length === 1 ? ' recently opened channel' : ' recently opened channels') : 'Your viewing history starts here';
  }

  function showHome() {
    home.hidden = false;
    guide.hidden = true;
    updateHome();
    homeFocus.focus();
  }

  function openHomeSection(button) {
    homeFocus = button;
    home.hidden = true;
    guide.hidden = false;
    var section = button.dataset.home;
    if (section === 'org' || section === 'free' || section === 'sports') {
      load(section === 'free' ? 1 : 0, true);
      if (section === 'sports' && groupButtons.Sports) groupButtons.Sports.click();
    } else {
      if (request) {
        var previousRequest = request;
        request = null;
        previousRequest.abort();
      }
      savedMode = section;
      channels = (section === 'favorites' ? favorites : recent).filter(function (c) { return catalog.some(function (entry) { return entry.url === c.url; }); });
      selectedGroup = '';
      search.value = '';
      loadMessage = channels.length ? '' : (section === 'favorites' ? 'Add favorites from a channel’s details.' : 'Channels you open will appear here.');
      browseHeading.textContent = 'Categories';
      renderCategories();
      filter();
    }
    sourceButtons[sourceIndex].focus();
  }

  function updateFavorite() {
    var saved = detailChannel && favorites.some(function (channel) { return channel.url === detailChannel.url; });
    favoriteButton.textContent = saved ? 'Remove from favorites' : 'Add to favorites';
    favoriteButton.setAttribute('aria-pressed', String(Boolean(saved)));
  }

  function groupsFor(channel) {
    var groups = channel.group.split(';').map(function (name) {
      name = name.trim();
      return !name || /^undefined$/i.test(name) ? 'Uncategorized' : name;
    });
    if (channel.language === 'Persian') groups.push('Persian');
    return groups.filter(function (name, index) { return groups.indexOf(name) === index; });
  }

  function renderCategories() {
    var counts = Object.create(null);
    channels.forEach(function (channel) {
      channel.groups = groupsFor(channel);
      channel.groups.forEach(function (group) {
        counts[group] = (counts[group] || 0) + 1;
      });
    });
    categories.textContent = '';
    groupButtons = Object.create(null);
    if (!channels.length) return;

    var order = ['Persian', 'Sports', 'Football', 'Combat Sports', 'Motorsport', 'Tennis', 'Cricket', 'Basketball', 'Golf', 'Outdoor Sports', 'News', 'Weather', 'Politics & Public Affairs', 'Business & Finance', 'Movies & Series', 'Classic TV & Westerns', 'Comedy', 'Crime & Investigation', 'Entertainment', 'Kids & Family', 'Documentaries', 'Education', 'Technology & Gaming', 'Music', 'Food & Cooking', 'Travel', 'Lifestyle', 'Automotive', 'Pets & Animals', 'Local & Regional', 'General TV', 'Faith & Culture', 'Shopping'];
    var names = Object.keys(counts).sort(function (a, b) {
      return (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || a.localeCompare(b);
    });
    [''].concat(names).forEach(function (group) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      var title = document.createElement('span');
      var count = document.createElement('span');
      button.type = 'button';
      button.className = 'category';
      button.setAttribute('aria-pressed', String(group === selectedGroup));
      title.textContent = group === 'Sports' ? 'All Sports' : group || 'All channels';
      count.textContent = (group ? counts[group] : channels.length).toLocaleString();
      count.setAttribute('aria-hidden', 'true');
      button.appendChild(title);
      button.appendChild(count);
      button.addEventListener('click', function () {
        groupButtons[selectedGroup].setAttribute('aria-pressed', 'false');
        selectedGroup = group;
        button.setAttribute('aria-pressed', 'true');
        filter();
      });
      groupButtons[group] = button;
      item.appendChild(button);
      categories.appendChild(item);
    });
  }

  function channelArtwork(element, channel) {
    var letters = document.createElement('span');
    letters.textContent = Array.from(channel.name).slice(0, 2).join('').toUpperCase();
    element.textContent = '';
    element.appendChild(letters);
    if (!channel.logo) return;

    var logo = document.createElement('img');
    logo.alt = '';
    logo.decoding = 'async';
    logo.referrerPolicy = 'no-referrer';
    logo.onload = function () {
      letters.hidden = true;
      logo.classList.add('ready');
    };
    logo.onerror = function () { logo.remove(); };
    element.appendChild(logo);
    logo.src = channel.logo;
  }

  function showDetails(index) {
    selectedIndex = index;
    var channel = results[index];
    detailsEmpty.hidden = Boolean(channel);
    detailsContent.hidden = !channel;
    if (detailChannel === channel) return;
    detailChannel = channel;
    if (!channel) return;
    activeSource.textContent = channel.sourceName || sources[sourceIndex].name;
    updateFavorite();
    document.getElementById('playback-note').textContent = channel.playbackNote || '';
    detailsTitle.textContent = channel.name;
    detailsGroup.textContent = channel.groups.join(' · ');
    channelArtwork(detailsLogo, channel);
    updateSchedule();
  }

  var dayGuide = document.getElementById('day-guide');
  var scheduleButton = document.getElementById('schedule-button');
  function programmeTime(p) {
    return p ? (new Date(p.start).toDateString() !== new Date().toDateString() ? new Date(p.start).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'}) + ' · ' : '') + new Date(p.start).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + ' – ' + new Date(p.end).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  }
  function updateSchedule() {
    if (!detailChannel || !window.channelSchedule) return;
    var epg = window.channelSchedule.get(detailChannel);
    document.getElementById('epg-now').textContent = epg.now ? epg.now.title : (epg.loading ? 'Loading schedule…' : 'No current listing');
    document.getElementById('epg-next').textContent = epg.next ? epg.next.title : (epg.loading ? 'Loading schedule…' : 'No upcoming listing');
    document.getElementById('epg-now-time').textContent = programmeTime(epg.now);
    document.getElementById('epg-next-time').textContent = programmeTime(epg.next);
    document.getElementById('epg-now').classList.toggle('football-programme', Boolean(epg.now && epg.now.football));
    document.getElementById('epg-next').classList.toggle('football-programme', Boolean(epg.next && epg.next.football));
    var progress=document.getElementById('epg-progress');progress.hidden=!epg.now;
    var percent=epg.now?Math.max(0,Math.min(100,100*(Date.now()-epg.now.start)/(epg.now.end-epg.now.start))):0;
    progress.firstChild.style.width=percent+'%';progress.setAttribute('aria-valuenow',String(Math.round(percent)));
    document.getElementById('epg-source').textContent=epg.source?'Guide: '+epg.source.toUpperCase()+' · Local time':(epg.loading?'':'Schedule unavailable for this feed');
    scheduleButton.textContent = "Today's schedule";
  }
  function renderDay() {
    if (!detailChannel || !window.channelSchedule) return;
    var epg=window.channelSchedule.get(detailChannel),now=Date.now();
    document.getElementById('day-title').textContent=detailChannel.name;
    document.getElementById('day-date').textContent=new Date(now).toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});
    var list=document.getElementById('day-list');list.textContent='';
    var ps=window.channelSchedule.today(epg.programmes,now);
    if(!ps.length){list.textContent=epg.loading?'Loading schedule…':'No schedule available for today.';return;}
    ps.forEach(function(p){
      var row=document.createElement('button');row.type='button';row.className='day-programme';
      row.classList.toggle('is-now',p.start<=now&&p.end>now);
      var time=document.createElement('time');time.textContent=programmeTime(p);
      var text=document.createElement('span');text.textContent=p.title;text.dir='auto';
      if(p.football)text.className='football-programme';
      row.appendChild(time);row.appendChild(text);list.appendChild(row);
    });
  }
  function closeDay(){dayGuide.hidden=true;scheduleButton.focus();}
  scheduleButton.addEventListener('click',function(){renderDay();dayGuide.hidden=false;document.getElementById('close-day').focus();});
  document.getElementById('close-day').addEventListener('click',closeDay);
  if(window.channelSchedule)window.channelSchedule.subscribe(function(){updateSchedule();if(!dayGuide.hidden){var active=document.activeElement;var index=Array.from(document.querySelectorAll('.day-programme')).indexOf(active);renderDay();var rows=document.querySelectorAll('.day-programme');if(index>=0&&rows[index])rows[index].focus();}});

  function render() {
    loading.hidden = !request;
    showDetails(0);
    resultsHeading.textContent = selectedGroup || (savedMode === 'favorites' ? 'Favorites' : savedMode === 'recent' ? 'Recently watched' : 'All channels');
    status.textContent = loadMessage || (results.length ?
      results.length.toLocaleString() + (results.length === 1 ? ' channel' : ' channels') :
      'No channels match your search.');
    list.textContent = '';
    cards.clear();
    viewport.scrollTop = 0;
    layoutGrid();
  }

  function createCard(index) {
    var channel = results[index];
    var item = document.createElement('li');
    var button = document.createElement('button');
    var mark = document.createElement('span');
    var name = document.createElement('span');
    var number = document.createElement('span');
    button.type = 'button';
    button.className = 'channel';
    button.title = channel.name;
    mark.className = 'channel-mark';
    mark.setAttribute('aria-hidden', 'true');
    channelArtwork(mark, channel);
    number.className = 'channel-number';
    number.textContent = index + 1;
    number.setAttribute('aria-hidden', 'true');
    name.className = 'channel-name';
    name.textContent = channel.name;
    name.dir = 'auto';
    button.appendChild(number);
    button.appendChild(mark);
    var copy = document.createElement('span');
    copy.className = 'channel-copy';
    copy.appendChild(name);
    var metadata = document.createElement('span');
    metadata.className = 'channel-meta';
    metadata.textContent = (channel.language || '') + ' · ' + channel.group.replace(/;/g, ' · ');
    copy.appendChild(metadata);
    button.appendChild(copy);
    button.addEventListener('focus', function () { showDetails(index); });
    button.addEventListener('click', function () {
      showDetails(index);
      watch(channel, button);
    });
    item.appendChild(button);
    button.dataset.index = index;
    item.setAttribute('aria-posinset', index + 1);
    item.setAttribute('aria-setsize', results.length);
    positionCard(item, index);
    return item;
  }

  function positionCard(item, index) {
    item.style.top = index * rowStep + 'px';
  }

  function layoutGrid() {
    if (guide.hidden) return;
    var style = window.getComputedStyle(list);
    rowStep = parseFloat(style.fontSize) * Number(style.getPropertyValue('--row-step'));
    list.style.height = results.length * rowStep + 'px';
    cards.forEach(positionCard);
    renderWindow();
  }

  function renderWindow() {
    if (guide.hidden || !rowStep) return;
    var top = viewport.scrollTop - list.offsetTop;
    var first = Math.max(0, Math.floor(top / rowStep) - 2);
    var end = Math.min(results.length, Math.ceil((top + viewport.clientHeight) / rowStep) + 2);
    var focused = document.activeElement;
    cards.forEach(function (item, index) {
      if ((index < first || index >= end) && !item.contains(focused)) {
        item.remove();
        cards.delete(index);
      }
    });

    var retained = Number(focused.dataset.index);
    var after = retained >= end ? cards.get(retained) : null;
    for (var index = end - 1; index >= first; index -= 1) {
      if (!cards.has(index)) {
        var card = createCard(index);
        list.insertBefore(card, after || null);
        cards.set(index, card);
      }
      after = cards.get(index);
    }
  }

  function focusCard(index) {
    if (index < 0 || index >= results.length) return;
    var top = list.offsetTop + index * rowStep;
    if (top < viewport.scrollTop + 5) {
      viewport.scrollTop = top - 5;
    } else if (top + rowStep > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = top + rowStep - viewport.clientHeight;
    }
    renderWindow();
    cards.get(index).firstChild.focus({ preventScroll: true });
    renderWindow();
  }

  function filter() {
    var query = search.value.trim().toLowerCase();
    results = channels.filter(function (channel) {
      return (!selectedGroup || channel.groups.indexOf(selectedGroup) !== -1) &&
        (channel.name + ' ' + channel.groups.join(' ')).toLowerCase().indexOf(query) !== -1;
    });
    render();
  }

  function load(index, reload) {
    if (request && index === sourceIndex && !reload) return;
    if (request) {
      var oldRequest = request;
      request = null;
      oldRequest.abort();
    }

    savedMode = '';
    sourceIndex = index;
    var source = sources[index];
    for (var i = 0; i < sourceButtons.length; i += 1) {
      sourceButtons[i].setAttribute('aria-pressed', String(i === index));
    }

    channels = [];
    selectedGroup = '';
    browseHeading.textContent = 'Categories';
    renderCategories();
    if (source.channels) {
      channels = source.channels.slice();
      loadMessage = '';
      search.value = '';
      renderCategories();
      filter();
      return;
    }
    if (source.setup) {
      loadMessage = source.setup;
      filter();
      return;
    }
    loadMessage = 'Loading ' + source.name + '…';
    var xhr = new XMLHttpRequest();
    request = xhr;
    filter();

    function finish(error) {
      if (request !== xhr) return;
      request = null;
      loadMessage = error ? 'Could not load ' + source.name + '. Select Reload to try again.' :
        (channels.length ? (index > 2 ? 'Community playlist • Not all channels playback-tested.' : '') : source.name + ' has no playable HTTP channels.');
      renderCategories();
      filter();
    }

    xhr.onload = function () {
      if (request !== xhr) return;
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error('HTTP ' + xhr.status);
        channels = parsePlaylist(xhr.responseText, xhr.responseURL || source.url);
        channels.forEach(function (channel) { channel.sourceName = source.name; });
        finish(false);
      } catch (error) {
        console.warn('Playlist load failed', error);
        finish(true);
      }
    };
    xhr.onerror = xhr.ontimeout = function () { finish(true); };
    try {
      xhr.open('GET', source.url, true);
      xhr.timeout = 20000;
      xhr.send();
    } catch (error) {
      console.warn('Playlist request failed', error);
      finish(true);
    }
  }

  function showControls() {
    window.clearTimeout(overlayTimer);
    controls.hidden = false;
    back.focus();
    if (!playStatus.textContent) {
      overlayTimer = window.setTimeout(function () { controls.hidden = true; }, 3500);
    }
  }

  function watch(channel, button) {
    recent = [channel].concat(recent.filter(function (entry) { return entry.url !== channel.url; })).slice(0, 20);
    persist('recent', recent);
    returnFocus = button;
    returnScroll = viewport.scrollTop;
    guide.hidden = true;
    screen.hidden = false;
    document.body.classList.add('playing');
    document.getElementById('now-playing').textContent = channel.name;
    document.getElementById('player-meta').textContent = [channel.language, channel.group.replace(/;/g, ' · ')].filter(Boolean).join(' · ');
    document.getElementById('toggle-player').textContent = 'Ⅱ Pause';
    channelPlayer.play(channel, function (message) {
      playStatus.textContent = message;
      showControls();
    });
  }

  function closePlayer() {
    window.clearTimeout(overlayTimer);
    channelPlayer.stop();
    screen.hidden = true;
    guide.hidden = false;
    document.body.classList.remove('playing');
    viewport.scrollTop = returnScroll;
    returnFocus.focus({ preventScroll: true });
    layoutGrid();
  }

  function move(code) {
    var active = document.activeElement;
    var top = Array.from(sourceNav.querySelectorAll('button'));
    var groups = Array.from(categories.querySelectorAll('button'));
    var selected = groupButtons[selectedGroup];
    var topIndex = top.indexOf(active);
    var groupIndex = groups.indexOf(active);
    var cardIndex = Number(active.dataset.index);
    var target;

    if (topIndex !== -1) {
      if (code === 37) target = top[topIndex - 1];
      if (code === 39) target = top[topIndex + 1];
      if (code === 40) {
        if (results.length && topIndex > 0) focusCard(selectedIndex);
        else target = selected || search;
      }
      if (code === 38) target = search;
    } else if (groupIndex !== -1) {
      if (code === 38) target = groups[groupIndex - 1] || sourceButtons[sourceIndex];
      if (code === 40) target = groups[groupIndex + 1];
      if (code === 39) {
        if (results.length) focusCard(selectedIndex);
        else target = search;
      }
    } else if (active === search) {
      if (code === 38) target = document.getElementById('search-button');
      else if (code !== 40) return false;
      else if (results.length) focusCard(selectedIndex);
      else target = selected;
    } else if (active === watchButton || active === favoriteButton || active === scheduleButton) {
      if (code === 37) focusCard(selectedIndex);
      var actions=[scheduleButton,watchButton,favoriteButton],actionIndex=actions.indexOf(active);
      if(code===38) target=actions[actionIndex-1]||search;
      if(code===40) target=actions[actionIndex+1];
    } else if (Number.isInteger(cardIndex)) {
      if (code === 37) target = selected;
      if (code === 39) target = watchButton;
      if (code === 38) {
        if (cardIndex > 0) focusCard(cardIndex - 1);
        else target = search;
      }
      if (code === 40) focusCard(cardIndex + 1);
      if (code === 33 || code === 34) {
        var step = Math.max(1, Math.floor(viewport.clientHeight / rowStep) - 1);
        focusCard(Math.max(0, Math.min(results.length - 1, cardIndex + (code === 33 ? -step : step))));
      }
    } else {
      target = sourceButtons[sourceIndex];
    }
    if (target) target.focus();
    return true;
  }

  for (var i = 0; i < sourceButtons.length; i += 1) {
    sourceButtons[i].addEventListener('click', function () {
      load(Number(this.getAttribute('data-source')), false);
    });
  }
  document.getElementById('search-button').addEventListener('click', function () { search.focus(); });
  document.getElementById('reload').addEventListener('click', function () { load(sourceIndex, true); });
  viewport.addEventListener('scroll', function () {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = null;
      renderWindow();
    });
  }, { passive: true });
  window.addEventListener('resize', layoutGrid);
  document.getElementById('home-button').addEventListener('click', showHome);
  homeButtons.forEach(function (button) {
    button.addEventListener('click', function () { openHomeSection(button); });
  });
  favoriteButton.addEventListener('click', function () {
    if (!detailChannel) return;
    var exists = favorites.some(function (channel) { return channel.url === detailChannel.url; });
    favorites = exists ? favorites.filter(function (channel) { return channel.url !== detailChannel.url; }) : favorites.concat([detailChannel]);
    persist('favorites', favorites);
    updateFavorite();
    if (savedMode === 'favorites' && exists) openHomeSection(homeFocus);
  });
  back.addEventListener('click', closePlayer);
  watchButton.addEventListener('click', function () {
    if (detailChannel) watch(detailChannel, watchButton);
  });
  search.addEventListener('input', filter);
  document.getElementById('search-form').addEventListener('submit', function (event) {
    event.preventDefault();
    focusCard(0);
  });

  function changePlayback(paused) {
    var result = channelPlayer.setPaused(paused);
    if (result === null) return;
    playStatus.textContent = result ? 'Paused' : '';
    document.getElementById('toggle-player').textContent = result ? '▶ Resume' : 'Ⅱ Pause';
    showControls();
    document.getElementById('toggle-player').focus();
  }
  document.getElementById('toggle-player').addEventListener('click', function () {
    changePlayback(!channelPlayer.isPaused());
  });
  if (window.tizen && window.tizen.tvinputdevice) {
    ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop'].forEach(function (key) {
      try { window.tizen.tvinputdevice.registerKey(key); } catch (error) { console.warn('Remote key unavailable', key); }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.isComposing || event.keyCode === 229) return;
    var code = event.keyCode;
    if (!dayGuide.hidden) {
      if(code===10009||code===27){event.preventDefault();closeDay();return;}
      if(code===38||code===40){event.preventDefault();var dayButtons=Array.from(dayGuide.querySelectorAll('button'));var di=dayButtons.indexOf(document.activeElement);var next=dayButtons[Math.max(0,Math.min(dayButtons.length-1,di+(code===40?1:-1)))];if(next){next.focus();next.scrollIntoView({block:'nearest'});}return;}
      return;
    }
    var mediaPlay = code === 415 || event.key === 'MediaPlay';
    var mediaPause = code === 19 || event.key === 'MediaPause';
    var mediaToggle = code === 10252 || event.key === 'MediaPlayPause';
    var mediaStop = code === 413 || event.key === 'MediaStop';
    if (mediaPlay || mediaPause || mediaToggle || mediaStop) {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (!screen.hidden) {
        if (mediaStop) closePlayer();
        else changePlayback(mediaPause || (mediaToggle && !channelPlayer.isPaused()));
      } else if (mediaPlay || mediaToggle) {
        if (!home.hidden) openHomeSection(homeButtons[0]);
        if (detailChannel) watch(detailChannel, cards.get(selectedIndex) ? cards.get(selectedIndex).firstChild : watchButton);
      }
      return;
    }
    if (!home.hidden) {
      var index = homeButtons.indexOf(document.activeElement);
      var target = index;
      var links = {
        org: { 39: 'free', 40: 'favorites' },
        free: { 37: 'org', 40: 'sports' },
        sports: { 37: 'org', 38: 'free', 40: 'recent' },
        favorites: { 38: 'org', 39: 'recent' },
        recent: { 37: 'favorites', 38: 'sports' }
      };
      var section = homeButtons[index] && homeButtons[index].dataset.home;
      var next = section && links[section][code];
      if (next) target = homeButtons.findIndex(function (button) { return button.dataset.home === next; });
      if (code >= 37 && code <= 40) {
        event.preventDefault();
        homeButtons[Math.max(0, target)].focus();
      }
      if (code === 10009 || code === 27) {
        event.preventDefault();
        if (window.tizen) window.tizen.application.getCurrentApplication().exit();
      }
      return;
    }
    if (code === 10009 || code === 27) {
      event.preventDefault();
      if (!screen.hidden) closePlayer();
      else if (document.activeElement === search) sourceButtons[sourceIndex].focus();
      else if (document.activeElement === watchButton || document.activeElement === favoriteButton || document.activeElement === scheduleButton) focusCard(selectedIndex);
      else if (document.activeElement.classList.contains('channel')) groupButtons[selectedGroup].focus();
      else if (document.activeElement.classList.contains('category')) sourceButtons[sourceIndex].focus();
      else showHome();
    } else if (!screen.hidden) {
      if (!controls.hidden && (code === 37 || code === 39)) {
        event.preventDefault();
        (document.activeElement === back ? document.getElementById('toggle-player') : back).focus();
      } else if (controls.hidden && (code === 13 || (code >= 37 && code <= 40))) {
        event.preventDefault();
        showControls();
      }
    } else if (((code >= 37 && code <= 40) || code === 33 || code === 34) && move(code)) {
      event.preventDefault();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !screen.hidden) closePlayer();
  });

  function updateClock() {
    var now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  updateClock();
  window.setInterval(updateClock, 30000);
  showHome();
}());
