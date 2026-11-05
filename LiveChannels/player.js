(function () {
  'use strict';

  var surface = document.getElementById('av-surface');
  var video = document.getElementById('browser-video');
  var close = function () {};

  function playCompatible(channel, report, onFailure) {
    if (!window.Hls || !window.Hls.isSupported()) {
      onFailure('Compatibility playback is unavailable on this device.');
      return;
    }
    var active = true;
    var hls;
    var timer;
    close = function () {
      active = false;
      window.clearTimeout(timer);
      video.onplaying = video.onwaiting = video.onerror = video.onended = null;
      if (hls) hls.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.hidden = true;
    };
    function fail(message) {
      if (!active) return;
      close();
      onFailure(message);
    }
    report('Connecting with compatibility player…');
    surface.hidden = true;
    video.hidden = false;
    timer = window.setTimeout(function () { fail('Stream connection timed out.'); }, 25000);
    video.onplaying = function () {
      if (!active) return;
      window.clearTimeout(timer);
      report('');
    };
    video.onwaiting = function () { if (active) report('Buffering…'); };
    video.onerror = function () { fail('The TV could not decode this stream.'); };
    video.onended = function () { fail('The stream ended.'); };
    try {
      hls = new window.Hls({ enableWorker: false, backBufferLength: 10, maxBufferLength: 15 });
      hls.on(window.Hls.Events.ERROR, function (event, data) {
        if (active && data.fatal) {
          var code = data.response && data.response.code;
          fail(code ? 'Stream provider returned HTTP ' + code + '.' :
            (data.type === 'networkError' ? 'The stream provider did not respond. Try again later.' : 'Stream unavailable (' + data.details + ').'));
        }
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        if (!active) return;
        var attempt = video.play();
        if (attempt) attempt.catch(function () { fail('The TV could not start this stream.'); });
      });
      hls.loadSource(channel.url);
      hls.attachMedia(video);
    } catch (error) { fail('Compatibility player: ' + error.message); }
  }

  function playWithFallback(channel, report, onFailure) {
    playDirect(channel, report, function (message) {
      if (/\.m3u8?(?:[?#]|$)/i.test(channel.url) && window.Hls && window.Hls.isSupported()) {
        playCompatible(channel, report, onFailure);
      } else { onFailure(message); }
    });
  }

  function playDirect(channel, report, onFailure) {
    var api = window.webapis && window.webapis.avplay;
    var active = true;
    var failed = false;
    var timer;
    var started = false;

    function status(message) {
      if (active && !failed) report(message);
    }

    function playing() {
      if (!active || failed) return;
      started = true;
      window.clearTimeout(timer);
      status('');
    }

    function fail(message) {
      if (!active || failed) return;
      failed = true;
      close();
      onFailure(message || 'This stream could not play. Return to the guide to try another channel.');
    }

    status('Connecting…');
    timer = window.setTimeout(function () {
      fail('The stream took too long to respond. Return to the guide to try another channel.');
    }, 25000);

    close = function () {
      active = false;
      window.clearTimeout(timer);
      if (api) {
        try {
          var state = api.getState();
          if (state === 'READY' || state === 'PLAYING' || state === 'PAUSED') api.stop();
        } catch (error) {
          console.warn('AVPlay stop failed', error);
        }
        try {
          if (api.getState() !== 'NONE') api.close();
        } catch (error) {
          console.warn('AVPlay close failed', error);
        }
        surface.hidden = true;
      } else {
        video.onplaying = video.onwaiting = video.onerror = video.onended = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.hidden = true;
      }
    };

    try {
      if (api) {
        surface.hidden = false;
        api.open(channel.url);
        if (channel.userAgent) api.setStreamingProperty('USER_AGENT', channel.userAgent);
        api.setListener({
          onbufferingstart: function () { status('Buffering…'); },
          onbufferingcomplete: function () { if (started) status(''); },
          oncurrentplaytime: function () { if (!started) playing(); },
          onerror: function (error) {
            console.warn('AVPlay playback error', error);
            fail('Samsung player: ' + error);
          },
          onstreamcompleted: function () { fail('The stream ended.'); }
        });
        // AVPlay always uses a 1920×1080 coordinate space for the TV display.
        api.setDisplayRect(0, 0, 1920, 1080);
        api.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
        api.prepareAsync(function () {
          if (!active) return;
          try {
            api.play();
          } catch (error) {
            console.warn('AVPlay could not start', error);
            fail();
          }
        }, function (error) {
          console.warn('AVPlay prepare failed', error);
          fail('Samsung player: ' + (error.message || error.name || 'Could not prepare stream'));
        });
      } else {
        video.hidden = false;
        video.onplaying = playing;
        video.onwaiting = function () { status('Buffering…'); };
        video.onerror = function () { fail(); };
        video.onended = function () { fail('The stream ended.'); };
        video.src = channel.url;
        var attempt = video.play();
        if (attempt) attempt.catch(function () { fail(); });
      }
    } catch (error) {
      console.warn('Player setup failed', error);
      fail();
    }
  }

  function play(channel, report) {
    close();
    channel = Object.assign({}, channel);
    var parsedUrl = new URL(channel.url);
    var legacyIrib = /^IRIB(?: TV)?([1-5])(?:\b|$)/i.exec(channel.name || '');
    if (parsedUrl.hostname === 'lenz.splus.ir' && legacyIrib) {
      channel.url = 'https://ncdn.telewebion.ir/tv' + legacyIrib[1] + '/live/playlist.m3u8';
      parsedUrl = new URL(channel.url);
    }
    if (parsedUrl.hostname === 'lenz.splus.ir' && parsedUrl.pathname.indexOf('/3221226637/') !== -1) {
      channel.url = 'https://ncdn.telewebion.ir/tv1/live/playlist.m3u8';
      parsedUrl = new URL(channel.url);
    }
    var host = parsedUrl.hostname;
    if (/(?:^|\.)(?:youtube\.com|youtu\.be|twitch\.tv|dailymotion\.com|dai\.ly)$/.test(host)) {
      close = function () {};
      report('This channel links to a video website. Choose a channel with a direct TV stream.');
      return;
    }
    var telewebion = /(?:^|\.)telewebion\.(?:ir|com)$/.test(host);
    if (telewebion) {
      var network = /\/(?:ek\/)?([^/]+)\/live\//.exec(parsedUrl.pathname);
      if (network && network[1] === 'tamasha') network[1] = 'hdtest';
      if (network) channel.url = 'https://ncdn.telewebion.ir/' + network[1] + '/live/playlist.m3u8';
    }
    var ifilm = host === 'live.presstv.co.uk' && /^https:\/\/live\.presstv\.co\.uk\/hls\/ifilm/i.test(channel.url);
    var original = function (message) { report(message); };
    if (!telewebion && !ifilm) {
      playWithFallback(channel, report, original);
      return;
    }

    var request = new XMLHttpRequest();
    var cancelled = false;
    close = function () {
      cancelled = true;
      request.abort();
    };
    report('Finding a compatible stream…');

    function start(url) {
      if (cancelled) return;
      cancelled = true;
      if (!url || url === channel.url) {
        playWithFallback(channel, report, original);
        return;
      }
      var rendition = { url: url, userAgent: channel.userAgent };
      if (telewebion && window.Hls && window.Hls.isSupported()) {
        playCompatible(rendition, report, original);
        return;
      }
      playWithFallback(rendition, report, function () {
        report('Trying the original stream…');
        playWithFallback(channel, report, original);
      });
    }

    request.onload = function () {
      if (request.status !== 200 || !/^#EXTM3U/.test(request.responseText)) {
        start();
        return;
      }
      var lines = request.responseText.split(/\r?\n/).map(function (line) { return line.trim(); });
      var variant = lines.find(function (line, index) {
        if (!/^#EXT-X-STREAM-INF:/.test(lines[index - 1] || '')) return false;
        return telewebion ? /^480p\/index\.m3u8(?:[?#]|$)/i.test(line) : /_4_\d+\/index\.m3u8(?:[?#]|$)/i.test(line);
      });
      if (!variant) {
        start();
        return;
      }
      var resolved;
      try {
        resolved = new URL(variant, request.responseURL || channel.url);
      } catch (error) {
        start();
        return;
      }
      var expectedHost = telewebion ? /(?:^|\.)telewebion\.ir$/ : /^live\.presstv\.co\.uk$/;
      start(resolved.protocol === 'https:' && expectedHost.test(resolved.hostname) ? resolved.href : null);
    };
    request.onerror = request.ontimeout = function () { start(); };
    try {
      request.open('GET', channel.url, true);
      request.timeout = 6000;
      request.send();
    } catch (error) {
      start();
    }
  }

  function setPaused(paused) {
    try {
      if (!video.hidden) {
        if (paused) video.pause();
        else { var result = video.play(); if (result) result.catch(function (error) { console.warn('Resume failed', error); }); }
        return paused;
      }
      var api = window.webapis && window.webapis.avplay;
      if (!api) return null;
      var state = api.getState();
      if (paused && state === 'PLAYING') api.pause();
      else if (!paused && state === 'PAUSED') api.play();
      else if (state !== 'PLAYING' && state !== 'PAUSED') return null;
      return paused;
    } catch (error) { console.warn('Playback control failed', error); return null; }
  }
  function isPaused() {
    if (!video.hidden) return video.paused;
    try { return window.webapis.avplay.getState() === 'PAUSED'; } catch (error) { return false; }
  }

  window.channelPlayer = {
    play: play,
    setPaused: setPaused,
    isPaused: isPaused,
    stop: function () { close(); close = function () {}; }
  };
}());
