/* Scrollabhängige Vergrößerung des Typoblocks und Anheben der Pfeile.
   Beides folgt der Scrollposition: runter vor, hoch zurück, oben wieder am Start.
   prefers-reduced-motion setzt beides aus. */

(function () {
  var marquee = document.querySelector("[data-marquee]");
  var track = document.querySelector("[data-marquee-track]");
  var arrows = document.querySelector(".scroll-arrows");

  if (!marquee || !track) {
    return;
  }

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var frame = 0;
  var maxScale = 1.22;
  var scrollRange = 720;
  var arrowDocTop = 0;
  var arrowExit = 900;
  var maxLift = 36;
  var minGap = 16;

  function lowestVisibleBottom() {
    var line = track.querySelector(".marquee-line:last-child");
    var lowest = -Infinity;

    if (!line) {
      return lowest;
    }

    var range = document.createRange();
    var spans = line.children;

    for (var i = 0; i < spans.length; i++) {
      var node = spans[i].firstChild;
      if (!node || node.nodeType !== 3) {
        continue;
      }

      var text = node.textContent;
      for (var c = 0; c < text.length; c++) {
        range.setStart(node, c);
        range.setEnd(node, c + 1);
        var rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.right < 0 || rect.left > window.innerWidth) {
          continue;
        }
        if (rect.bottom > lowest) {
          lowest = rect.bottom;
        }
      }
    }

    return lowest;
  }

  function updateRange() {
    var previous = marquee.style.getPropertyValue("--marquee-scale");
    marquee.style.setProperty("--marquee-scale", String(maxScale));

    var bottom = lowestVisibleBottom();
    var top = 0;
    var node = track;

    while (node) {
      top += node.offsetTop;
      node = node.offsetParent;
    }

    var height = track.offsetHeight;
    var swing = window.innerWidth * Math.sin((5 * Math.PI) / 180) * 0.5;
    var fallback = top + height * 0.5 + (height * 0.5 + swing) * maxScale;
    /* Scrollposition, an der die Unterkante bei Endgröße den Viewport verlässt. */
    scrollRange = Math.max(520, bottom === -Infinity ? fallback : bottom + window.scrollY);

    if (arrows) {
      var previousLift = arrows.style.getPropertyValue("--arrow-lift");
      arrows.style.setProperty("--arrow-lift", "0px");

      var arrowTop = 0;
      var arrowNode = arrows;
      while (arrowNode) {
        arrowTop += arrowNode.offsetTop;
        arrowNode = arrowNode.offsetParent;
      }
      arrowDocTop = arrowTop;

      var grownText = textBottomAboveArrows();
      var openGap = grownText === -Infinity ? 64 : arrows.getBoundingClientRect().top - grownText;
      /* Hub so groß, dass über den Pfeilen auch bei voller Typo noch Luft bleibt. */
      maxLift = Math.max(12, Math.round(openGap - 22));
      arrowExit = Math.max(480, arrowTop + arrows.offsetHeight - maxLift);

      if (previousLift) {
        arrows.style.setProperty("--arrow-lift", previousLift);
      } else {
        arrows.style.removeProperty("--arrow-lift");
      }
    }

    if (previous) {
      marquee.style.setProperty("--marquee-scale", previous);
    } else {
      marquee.style.removeProperty("--marquee-scale");
    }
  }

  /* Typo: am Anfang etwas schneller, am Ende langsamer, Steigung bleibt. */
  function easeOut(progress) {
    return progress * (1.16 - 0.16 * progress);
  }

  /* Pfeile: an beiden Enden still, in der Mitte am schnellsten. Nahe der Typo läuft die Bewegung aus. */
  function arrowEase(progress) {
    return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  }

  /* Unterkante der Typo nur über den Pfeilspitzen, nicht an der gedrehten Außenkante. */
  function textBottomAboveArrows() {
    var marks = arrows.querySelectorAll(".scroll-arrow");
    if (!marks.length) {
      return -Infinity;
    }

    var left = Infinity;
    var right = -Infinity;
    for (var i = 0; i < marks.length; i++) {
      var box = marks[i].getBoundingClientRect();
      if (box.left < left) {
        left = box.left;
      }
      if (box.right > right) {
        right = box.right;
      }
    }
    left -= 28;
    right += 28;

    var line = track.querySelector(".marquee-line:last-child");
    if (!line) {
      return -Infinity;
    }

    var range = document.createRange();
    var lowest = -Infinity;
    var spans = line.children;

    for (var s = 0; s < spans.length; s++) {
      var node = spans[s].firstChild;
      if (!node || node.nodeType !== 3) {
        continue;
      }
      var text = node.textContent;
      for (var c = 0; c < text.length; c++) {
        range.setStart(node, c);
        range.setEnd(node, c + 1);
        var rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.right < left || rect.left > right) {
          continue;
        }
        if (rect.bottom > lowest) {
          lowest = rect.bottom;
        }
      }
    }

    return lowest;
  }

  function render() {
    frame = 0;

    if (motionQuery.matches) {
      marquee.style.setProperty("--marquee-scale", "1");
      if (arrows) {
        arrows.style.setProperty("--arrow-lift", "0px");
      }
      return;
    }

    var progress = window.scrollY / scrollRange;
    if (progress < 0) {
      progress = 0;
    } else if (progress > 1) {
      progress = 1;
    }

    var scale = 1 + (maxScale - 1) * easeOut(progress);
    marquee.style.setProperty("--marquee-scale", scale.toFixed(4));

    if (!arrows) {
      return;
    }

    var y = window.scrollY;
    var arrowProgress = y / arrowExit;
    if (arrowProgress < 0) {
      arrowProgress = 0;
    } else if (arrowProgress > 1) {
      arrowProgress = 1;
    }

    /* Wie die Typo: an die Scrollposition gebunden, beim Hochscrollen zurück. */
    var lift = maxLift * arrowEase(arrowProgress);
    var layoutTop = arrowDocTop - y;
    var textBottom = textBottomAboveArrows();
    if (textBottom !== -Infinity) {
      var allowed = layoutTop - textBottom - minGap;
      if (allowed < 0) {
        allowed = 0;
      }
      if (lift > allowed) {
        lift = allowed;
      }
    }

    arrows.style.setProperty("--arrow-lift", lift.toFixed(2) + "px");
  }

  function requestRender() {
    if (frame) {
      return;
    }
    frame = window.requestAnimationFrame(render);
  }

  function onMotionChange() {
    if (motionQuery.matches) {
      window.removeEventListener("scroll", requestRender);
      marquee.style.setProperty("--marquee-scale", "1");
      if (arrows) {
        arrows.style.setProperty("--arrow-lift", "0px");
      }
      return;
    }
    window.addEventListener("scroll", requestRender, { passive: true });
    requestRender();
  }

  updateRange();
  onMotionChange();

  window.addEventListener("resize", function () {
    updateRange();
    requestRender();
  });

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", onMotionChange);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      updateRange();
      requestRender();
    });
  }
})();

/* Auf Touchgeräten derselbe Bild-Effekt wie beim Hover, für 1 Sekunde. */
(function () {
  var tiles = document.querySelectorAll(".gallery .tile");

  if (!tiles.length) {
    return;
  }

  var hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var timers = new WeakMap();

  function arm(tile) {
    if (hoverQuery.matches || motionQuery.matches) {
      return;
    }

    var existing = timers.get(tile);
    if (existing) {
      window.clearTimeout(existing);
    }

    tile.classList.add("is-pressed");
    timers.set(tile, window.setTimeout(function () {
      tile.classList.remove("is-pressed");
      timers.delete(tile);
    }, 1000));
  }

  for (var i = 0; i < tiles.length; i++) {
    tiles[i].addEventListener("click", function (event) {
      arm(event.currentTarget);
    });
  }
})();

/*Mail-Adresse*/

const user = "kontakt";
  const domain = "paulboehm.com";

  const emailLink = document.getElementById("email-link");

  emailLink.href = "mailto:" + user + "@" + domain;