/* global module */
(function (root) {
  'use strict';

  function parse(text, playlistUrl) {
    if (!/^#EXTM3U8?(?:\s|$)/.test(text.trim())) {
      throw new Error('The source did not return an M3U playlist.');
    }

    var channels = [];
    var pending = null;
    text.split(/\r?\n/).forEach(function (rawLine) {
      var line = rawLine.trim();
      if (/^#EXTINF:/i.test(line)) {
        // The first comma outside quotes separates attributes from the display name.
        var match = /^#EXTINF:((?:"[^"]*"|[^",])*)\s*,(.*)$/i.exec(line);
        if (!match) {
          pending = null;
          return;
        }
        var group = /(?:^|\s)group-title="([^"]*)"/i.exec(match[1]);
        var logo = /(?:^|\s)tvg-logo="([^"]*)"/i.exec(match[1]);
        pending = {
          name: match[2].trim(),
          tvgId: ((/tvg-id="([^"]*)"/i.exec(match[1]) || [])[1] || ''),
          language: ((/tvg-language="([^"]*)"/i.exec(match[1]) || [])[1] || ''),
          group: group ? group[1].trim() : '',
          logo: logo && /^https:\/\//i.test(logo[1].trim()) ? logo[1].trim() : '',
          userAgent: ''
        };
      } else if (pending && /^#EXTVLCOPT:http-user-agent=/i.test(line)) {
        pending.userAgent = line.slice(line.indexOf('=') + 1).trim();
      } else if (pending && line && line.charAt(0) !== '#') {
        try {
          var url = new URL(line, playlistUrl);
          if (/^https?:$/.test(url.protocol) && pending.name) {
            pending.url = url.href;
            channels.push(pending);
          }
        } catch (error) {
          // A malformed entry should not prevent browsing the rest of the source.
        }
        pending = null;
      }
    });
    return channels;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = parse;
  } else {
    root.parsePlaylist = parse;
  }
}(this));
