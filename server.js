import express from 'express'; // O Express ajuda a criar o servidor para receber os pedidos da rede
import dotenv from 'dotenv'; // O Dotenv serve para ler o arquivo secreto .env (onde guardamos senhas)
import conectarBanco from './db.js'; // Importa a função que criamos para ligar o nosso código ao banco de dados

// Lê o arquivo .env para pegar as senhas e configurações
dotenv.config();

// Liga o nosso servidor Express
const app = express();

// Avisa o servidor que vamos receber e enviar dados no formato JSON (textos estruturados)
app.use(express.json());

// Pega a porta do arquivo .env. Se ela não existir, usa a porta 3000 por padrão
const PORTA = process.env.PORTA || 3000; 

// Conecta de fato ao banco de dados MariaDB e guarda essa conexão na variável
const conexao = conectarBanco();

app.post("/tarefas", async (req, res) => {
    try {
        // Pega os dados que foram enviados no corpo (Body) da requisição
        const { nome, descricao, responsavel, data_tarefa, concluido } = req.body;
        // Se esquecerem de enviar o nome, o responsável ou a data, nós barramos aqui
        if (!nome || !responsavel || !data_tarefa) {
            return res.status(400).json({ erro: "Nome, responsável e data são obrigatórios!" });
        }

        // Se mandarem 'true' (verdadeiro), vira 1. Se não, vira 0. O banco só entende números.
        const statusConcluido = concluido ? 1 : 0;

        // Comando SQL para colocar a nova tarefa na tabela
        const sql = "INSERT INTO tarefas (nome, descricao, responsavel, data_tarefa, concluido) VALUES (?, ?, ?, ?, ?)";
        
        // Executa o comando no banco de dados passando as informações nas interrogações (?)
        const resposta = await conexao.query(sql, [nome, 
            descricao, 
            responsavel, 
            data_tarefa, 
            statusConcluido]);
        
        // Se deu tudo certo, responde avisando o ID da tarefa criada e uma mensagem de sucesso
        res.status(201).json({
            id: Number(resposta.insertId), 
            message: "Tarefa cadastrada com sucesso!"
        });
    } catch (erro) {
        // Se o código der algum erro, mostra no terminal e avisa quem chamou a API
        console.error("ERRO NO POST /TAREFAS:", erro.message);
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: erro.message });
    }
});
// 2. ROTA PARA BUSCAR UMA TAREFA ESPECÍFICA (GET POR ID)
app.get("/tarefa/:id", async (req, res) => {
    try {
        // Pega o número do ID enviado no final do link
        const id = req.params.id;
        
        // Comando SQL para buscar apenas a tarefa que tem aquele ID
        const sql = "SELECT * FROM tarefas WHERE id = ?";
        const tarefas = await conexao.query(sql, [id]);

        // Se o banco de dados achou a tarefa (ou seja, se a lista não veio vazia)
        if (tarefas.length > 0) {
            res.json({
                mensagem: "Tarefa encontrada com sucesso!",// Envia a mensagem de sucesso E os dados da tarefa juntos
                dados: tarefas
            });
        } else {
            res.status(404).json({ message: "Tarefa não encontrada!" }); // Avisa que não existe esse ID
        }
    } catch (erro) {
        console.error("ERRO NO GET /TAREFA/:ID:", erro.message);
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: erro.message });
    }
});

// 3. ROTA PARA LISTAR TAREFAS POR PERÍODO DE TEMPO (GET POR DATAS)
// Link para testar: http://localhost:3000/tarefas/periodo?inicio=2026-01-01&fim=2026-12-31
app.get("/tarefas/periodo", async (req, res) => {
    try {
        // Pega as datas de 'inicio' e 'fim' enviadas na URL após a interrogação
        const { inicio, fim } = req.query;

        // Se esquecerem de colocar alguma das duas datas, dá erro
        if (!inicio || !fim) { // || = or, ou
            return res.status(400).json({ erro: "As datas de 'inicio' e 'fim' são obrigatórias na URL!" });
        }

        // Comando SQL para buscar tarefas que estejam 'ENTRE' (BETWEEN) a data de início e fim
        const sql = "SELECT * FROM tarefas WHERE data_tarefa BETWEEN ? AND ? ORDER BY data_tarefa ASC";
        const tarefas = await conexao.query(sql, [inicio, fim]); // Pede para o banco buscar as tarefas e guarda o resultado na variável 

       res.json({
            message: "Tarefas do período listadas com sucesso!",
            quantidade: tarefas.length, // Mostra quantas tarefas foram achadas
            dados: tarefas             // Envia a lista com as tarefas de fato
        });
    } catch (erro) {
        console.error("ERRO NO GET /TAREFAS/PERIODO:", erro.message);
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: erro.message });
    }
});

// 4. ROTA PARA ATUALIZAR UMA TAREFA (PUT)
app.put("/tarefa/:id", async (req, res) => {
    try {
        const id = req.params.id; // Pega o ID da tarefa que queremos mudar
        const { nome, descricao, responsavel, data_tarefa, concluido } = req.body; // Pega os novos dados

        const statusConcluido = concluido ? 1 : 0; // Transforma o status em 1 ou 0 para o banco

        // Comando SQL para alterar os dados daquela tarefa específica pelo ID
        const sql = "UPDATE tarefas SET nome = ?, descricao = ?, responsavel = ?, data_tarefa = ?, concluido = ? WHERE id = ?";
        const resposta = await conexao.query(sql, [nome, 
            descricao, 
            responsavel, 
            data_tarefa, 
            statusConcluido, 
            id]);
        
        // Se o banco diz que alguma linha foi alterada (affectedRows maior que zero)
        if (resposta.affectedRows > 0) {
            res.json({ message: "Tarefa updated com sucesso!" });
        } else {
            res.status(404).json({ message: "Tarefa não encontrada!" });
        }
    } catch (erro) {
        console.error("ERRO NO PUT /TAREFA:", erro.message);
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: erro.message });
    }
});

// 5. ROTA PARA DELETAR UMA TAREFA (DELETE)
app.delete("/tarefa/:id", async (req, res) => {
    try {
        const id = req.params.id; // Pega o ID da tarefa que será apagada
        
        // Comando SQL para deletar a tarefa pelo ID
        const sql = "DELETE FROM tarefas WHERE id = ?";
        const resposta = await conexao.query(sql, [id]);

        // Se o banco confirmou que conseguiu apagar a linha
        if (resposta.affectedRows > 0) {
            res.json({ message: "Tarefa deletada com sucesso!" });
        } else {
            res.status(404).json({ message: "Tarefa não encontrada!" });
        }
    } catch (erro) {
        console.error("ERRO NO DELETE /TAREFA:", erro.message);
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: erro.message });
    }
});

// Faz o servidor começar a rodar e "ficar ouvindo" as chamadas na porta escolhida
app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});