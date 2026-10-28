const express = require('express');
const index = require('./index');
const cors = require('cors');
// Variabeis constantes e configugrações 
const app = express();
app.use(express.json());
app.use(cors());
//Função do cadastro: 
app.post('/Formulario', async (req, res) => {
    const jogador = req.body;
    const resultado = await index.cadastrar(jogador);
    res.send(`Recebido como: ${jogador}`);
    
});

// Verifica se o jogador existe retornando apenas 2 possivel mensagens
app.get('/Search/JogadorExiste', async (req, res) => {
    const jogadorNome = req.query.name;
    console.log("jogadorNome:", jogadorNome);
    const resultado = await index.procurar_deletar("buscar", jogadorNome);

    if(resultado.sucesso) {
         res.json(`${resultado.jogador.nome}: Jogador encontrado`);
    }  {
        res.json(`${jogadorNome}: ${resultado.erro}`);
    }
});

app.get('/Search/JogadorDados', async (req, res) => {
    const jogadorNome = req.query.name;
    console.log("jogadorNome:", jogadorNome);
    const resultado = await index.procurar_deletar("buscar", jogadorNome);

    res.json(resultado);
});

app.get('/Search/ListarJogadores', async (req, res) => {
    const resultado = await index.ListarJogadores();

    res.json(resultado);
});

app.listen(3000);