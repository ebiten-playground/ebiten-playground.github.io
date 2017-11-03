// Copyright 2017 The Ebiten Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// The source code of the storage is at https://github.com/hajimehoshi/snippets
const snippets = 'https://natto-umeboshi-20170912.appspot.com/'
const defaultProg = `// Ebiten:               https://hajimehoshi.github.io/ebiten/
// Ebiten API Reference: https://godoc.org/github.com/hajimehoshi/ebiten

package main

import (
	"log"

	"github.com/hajimehoshi/ebiten"
	"github.com/hajimehoshi/ebiten/ebitenutil"
)

const (
	screenWidth  = 320
	screenHeight = 240
)

var x = 0
var vx = 1
var ebitenImage *ebiten.Image

func init() {
	var err error
	ebitenImage, _, err = ebitenutil.NewImageFromFile("https://hajimehoshi.github.io/ebiten/examples/_resources/images/ebiten.png", ebiten.FilterNearest)
	if err != nil {
		log.Fatal(err)
	}
}

func update(screen *ebiten.Image) error {
	// Update
	x += vx

	switch {
	case x > screenWidth-ebitenImage.Bounds().Dx():
		vx = -1
	case x < 0:
		vx = 1
	}

	if ebiten.IsRunningSlowly() {
		return nil
	}

	// Draw
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(float64(x), 100)
	screen.DrawImage(ebitenImage, op)
	ebitenutil.DebugPrint(screen, "Hello, Ebiten Playground!")

	return nil
}

func main() {
	if err := ebiten.Run(update, screenWidth, screenHeight, 2, "Test"); err != nil {
		log.Fatal(err)
	}
}
`;

function setButtonsDisabled(value) {
  let buttons = document.querySelectorAll('.btn');
  for (let button of buttons) {
    button.disabled = value;
  }
}

function init() {
  Go.RedirectConsole(l => {
    document.getElementById('console').textContent += l;
  });
  window.addEventListener('message', e => {
    window.goPrintToConsole(e.data);
  });

  let editor = ace.edit(document.getElementById('pg-editor'));

  // Surpress warnings of Chrome.
  editor.$blockScrolling = Infinity;

  editor.setTheme('ace/theme/sqlserver');
  editor.getSession().setMode('ace/mode/golang');
  editor.getSession().setOptions({ tabSize: 4, useSoftTabs: false });

  setButtonsDisabled(true);
  if (window.location.hash) {
    let hash = window.location.hash.substring(1);
    if (hash[0] === '/') {
      hash = hash.substring(1);
    }
    fetch(`${snippets}${hash}`).then(response => {
      if (200 <= response.status && response.status < 300)
        return response.text();
      return Promise.reject(response);
    }).then(text => {
      editor.setValue(text, -1);
      setButtonsDisabled(false);
    }).catch(_ => {
      location.href = location.href.split('#')[0];
    });
  } else {
    editor.setValue(defaultProg, -1);
    setButtonsDisabled(false);
  }

  let fontSize = parseInt(getCookie('fontsize'), 10);
  if (fontSize === 0 || isNaN(fontSize)) {
    fontSize = 16;
  }
  document.getElementById('pg-fontsize').value = fontSize;
  editor.setFontSize(fontSize);

  document.getElementById('pg-fontsize').addEventListener('change', (e) => {
    e.preventDefault()
    let size = +(document.getElementById('pg-fontsize').value);
    editor.setFontSize(size);
    setCookie('fontsize',size,365);
  });

  document.getElementById('pg-format').addEventListener('click', (e) => {
    e.preventDefault();
    setButtonsDisabled(true);
    let src = editor.getValue();
    Go.Format(src, document.getElementById('pg-imports').checked)
      .then(s => editor.setValue(s,-1))
      .then(() => setButtonsDisabled(false))
      .catch(err => {
        document.getElementById('console').textContent = err;
        setButtonsDisabled(false);
      })
  });

  document.getElementById('pg-share').addEventListener('click', (e) => {
    e.preventDefault()
    let share = document.getElementById('pg-share');
    share.disabled = true;
    fetch(`${snippets}`, {
      method: 'POST',
      body:   editor.getValue(),
    }).then(response => {
      return response.text();
    }).then(text => {
      location.hash = `#/${text}`;
      let sharelink = document.getElementById('pg-sharelink');
      sharelink.value = location.href;
      sharelink.select();
      share.disabled = false;
    }).catch(err => {
      document.getElementById('console').textContent = err;
    });
  });

  document.getElementById('pg-run').addEventListener('click', (e) => {
    e.preventDefault();
    setButtonsDisabled(true);
    Go.Compile(editor.getValue())
      .then((src) => {
        document.getElementById('console').textContent = '';
        let output = document.getElementById('output')
        while (output.firstChild) {
          output.removeChild(output.firstChild);
        }
        // TODO: allowfullscreen
        let iframe = document.createElement('iframe');
        iframe.className = 'embed-responsive-item';
        iframe.srcdoc = `<!DOCTYPE html>
<head>
<script>
window.goPrintToConsole = text => {
  window.top.postMessage(text, '*');
};
window.addEventListener('message', e => {
  let script = document.createElement('script');
  script.textContent = e.data;
  document.body.appendChild(script);
});
</script>
</head>
<body>
</body>
`;
        iframe.sandbox = 'allow-forms allow-scripts allow-modals allow-popups';
        iframe.addEventListener('load', _ => {
          iframe.contentWindow.postMessage(src, '*');
        });

        output.appendChild(iframe);
        setButtonsDisabled(false);
      })
      .catch((err) => {
        document.getElementById('console').textContent = err;
        setButtonsDisabled(false);
      });
  });

  document.getElementById('nav-about').addEventListener('click', e => {
    e.preventDefault();
    let playground = document.getElementById('container-playground');
    let about = document.getElementById('container-about');
    if (playground.style.display === 'block' || playground.style.display === '') {
      playground.style.display = 'none';
      about.style.display = 'block';
    } else {
      playground.style.display = 'block';
      about.style.display = 'none';
    }
  });
}

window.addEventListener('load', init);

function setCookie(cname, cvalue, exdays) {
  let d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = 'expires='+ d.toUTCString();
  document.cookie = `${cname}=${cvalue};${expires};path=/`;
}

function getCookie(cname) {
  let name = cname + '=';
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}
