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
const defaultProg = `package main

import (
    "fmt"
    "github.com/gopherjs/gopherjs/js"
)

func main() {
    fmt.Println("Hai")
    doc := js.Global.Get("document")
    doc.Get("body").Set("innerHTML", "HAI")
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

  let el = document.getElementById('pg-editor')
  let editor = ace.edit(el);

  // Surpress warnings of Chrome.
  editor.$blockScrolling = Infinity;

  editor.setTheme('ace/theme/sqlserver');
  editor.getSession().setMode('ace/mode/golang');

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
  if (fontSize === 0) {
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
      .then(() => {setButtonsDisabled(false);})
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
        let div = document.createElement('div');
        div.classList.add('embed-responsive');
        div.classList.add('embed-responsive-4by3');
        // allowfullscreen
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
        div.appendChild(iframe);
        output.appendChild(div);

        iframe.addEventListener('load', _ => {
          iframe.contentWindow.postMessage(src, '*');
        });
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
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname) {
  let name = cname + '=';
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
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
