export const SEARCH_RESULTS_HTML = `
<html><body>
  <div class="similarname"><a href="anime.php?abc12" onclick="track('x')">Frieren: Beyond Journey's End</a></div>
  <div class="similarname"><a href="anime.php?def34">Frieren: Beyond Journey's End Season 2</a></div>
  <div class="unrelated"><a href="news.php?1">News</a></div>
</body></html>`;

export const EPISODES_HTML = `
<html><body>
  <a href="gate.php" id="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" onclick='go(this)'><div class="watch2">2</div></a>
  <a href="gate.php" id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"><div class="watch2">1</div></a>
  <a href="gate.php" id="not-a-key"><div class="watch2">3</div></a>
  <a href="gate.php" id="cccccccccccccccccccccccccccccccc"><div class="watch2">Trailer</div></a>
</body></html>`;

export const GATE_HTML = `
<html><body>
  <a href="https://cdn.animeheaven.me/video.mp4?stream=1">Watch online</a>
  <a href="https://cdn.animeheaven.me/video.mp4?download=1" onclick="count()">Download Episode</a>
</body></html>`;

export const GATE_WITHOUT_DOWNLOAD_HTML = '<html><body><p>Episode not available</p></body></html>';
