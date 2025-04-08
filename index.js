import puppeteer from 'puppeteer';
import { REPERTORIOS } from './repertorios.js';
import fetch from 'node-fetch';

const API_URL = 'https://repertorio-unidos-em-cristo.onrender.com/api/musicas';
const API_TOKEN = 'abc123';
const BASE_URL = 'https://www.cifraclub.com.br';
function adicionarParametros(path, novosParams = {}) {
    const url = new URL(path, 'https://www.cifraclub.com.br');
  
    // Pega e manipula os parâmetros do hash (#)
    const currentHash = url.hash.startsWith('#') ? url.hash.substring(1) : '';
    const hashParams = new URLSearchParams(currentHash);
  
    // Adiciona ou sobrescreve os novos parâmetros
    for (const [key, value] of Object.entries(novosParams)) {
      hashParams.set(key, value);
    }
  
    url.hash = hashParams.toString();
    return url.toString();
  }

async function getRepertorioMusicas(page, url) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (err) {
      console.warn(`⚠️ Timeout tentando acessar ${url}, tentando de novo em 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
  
    const categoria = await page.$eval('span.songbook-title', el => el.textContent.trim());
    const musicas = await page.$$eval('ol.list-musics li a', links => {
      return links.map(link => link.getAttribute('href').split('#')[0]);
    });
  
    return { categoria, musicas };
  }
  

async function scrapeMusica(page, path, categoria) {
    const fullUrl = adicionarParametros(path, {
        footerChords: 'false',
        tabs: 'false'
      });

    try {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

        const obj = await page.evaluate((categoria) => {
            const dados = {};

            dados['titulo'] = document.querySelector('h1.t1')?.innerText || '';

            const tom = document.querySelector('#cifra_tom a')?.innerText;
            dados['tom'] = tom ? tom.trim() : '';

            const capoText = document.querySelector('#cifra_capo a')?.innerText || '';
            const matchCapo = capoText.match(/\d+/);
            dados['capotraste'] = matchCapo ? parseInt(matchCapo[0]) : 0;

            const cifra = document.querySelector('.cifra_cnt pre')?.innerText || '';
            dados['letra'] = cifra.trim();

            dados['categoria'] = categoria.toUpperCase();

            return dados;
        }, categoria);

        return obj;

    } catch (err) {
        console.error(`❌ Erro ao raspar ${fullUrl}`, err.message);
        return null;
    }
}

async function enviarCifra(obj) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify(obj)
    });

    const result = await res.json();
    return result;
}

async function executarWorker() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

    const page = await browser.newPage();

    for (const repertorioUrl of REPERTORIOS) {
        console.log(`📂 Processando repertório: ${repertorioUrl}`);

        try {
            const { categoria, musicas } = await getRepertorioMusicas(page, repertorioUrl);
            console.log(`🎼 Categoria: ${categoria} | 🎵 Músicas: ${musicas.length}`);

            for (const path of musicas) {
                const musica = await scrapeMusica(page, path, categoria);
                if (musica) {
                    const res = await enviarCifra(musica);
                    console.log(`✅ ${musica.titulo} enviada.`, res.message || '');
                }
            }

        } catch (err) {
            console.error(`❌ Erro no repertório ${repertorioUrl}:`, err.message);
        }

        console.log('-----------------------------');
    }

    await browser.close();
}

executarWorker();
