const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }
  console.error('service-account.json não encontrado');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

// Lista fornecida pelo usuário (nome + bairro)
const listaFornecida = [
  { nome: "Balão Bengui", bairro: "Bengui" },
  { nome: "Thiago Caroço", bairro: "Bengui" },
  { nome: "Cleber Pinheiro", bairro: "Guama" },
  { nome: "Bruno Martins", bairro: "Sacramenta" },
  { nome: "Mary Marajó (Tilo)", bairro: "Marajó" },
  { nome: "Antonio Pinto", bairro: "Cidade Nova" },
  { nome: "Jeferson Ferreira", bairro: "Cordeiro" },
  { nome: "Thiago Peixaria", bairro: "Barcarena" },
  { nome: "Jose Carlos Planalto", bairro: "Planalto" },
  { nome: "Arnaldo Gabrie", bairro: "Pratinha" },
  { nome: "Ze Vandro", bairro: "Bairro De Fátima" },
  { nome: "Denise Matias", bairro: "Telégrafo" },
  { nome: "Peterson Venâncio", bairro: "Buenos Aires" },
  { nome: "Cristina (Gordin)", bairro: "Levilandia" },
  { nome: "Angela Assis", bairro: "Castanhal" },
  { nome: "Rayson Rodrigues", bairro: "Jaderlandia" },
  { nome: "Silvio Sousa", bairro: "Guanabara" },
  { nome: "Max Cabanagem", bairro: "Cabanagem" },
  { nome: "Eros Martins Una", bairro: "Una" },
  { nome: "Deivid Roberto", bairro: "Cabanagem" },
  { nome: "Diego Rocha", bairro: "Mario Covas" },
  { nome: "Jessica Pereira", bairro: "Sacramenta" },
  { nome: "Reginaldo Dias", bairro: "Cotijuba" },
  { nome: "MS Barbearia", bairro: "Bengui" },
  { nome: "Almir", bairro: "Tapanã" },
  { nome: "Jorge Damião", bairro: "Parque Verde" },
  { nome: "Alexandre", bairro: "Icoaraci" },
  { nome: "Robson", bairro: "Distrito" },
  { nome: "Fábio Secco", bairro: "Mangueirão" },
  { nome: "Oseas Rodrigues", bairro: "Guamá" },
  { nome: "Ewerton Santos", bairro: "Icoaraci" },
  { nome: "Guilherme (Cunhado Teka)", bairro: "Guamá" },
  { nome: "Lucio Santiago", bairro: "Bujaru" },
  { nome: "Waldielle Rocha", bairro: "Taua" },
  { nome: "Ruy Carlos", bairro: "Icoaraci" },
  { nome: "Edson", bairro: "Pratinha" },
  { nome: "Gerson Borges", bairro: "Parque Verde" },
  { nome: "Adilton", bairro: "Telegrafo" },
  { nome: "Macksoel da Silva", bairro: "Telegrafo" },
  { nome: "Edilson Cunha", bairro: "Tenone" },
  { nome: "Tuba", bairro: "Tenone" },
  { nome: "Heraldo", bairro: "Marituba" },
  { nome: "Jonnys Raimundo", bairro: "Télegrafo" },
  { nome: "Leandro Wágner", bairro: "Coqueiro" },
  { nome: "Ricardo Junior", bairro: "Coqueiro" },
  { nome: "Núbia de Araújo", bairro: "Pratinha" },
  { nome: "Jackson", bairro: "Outeiro" },
  { nome: "Lukas kaue", bairro: "Distrito" },
  { nome: "Fabio", bairro: "Icoaraci" },
  { nome: "Adawilkson Santos", bairro: "Taua" },
  { nome: "Maria Antônia", bairro: "Cidade Nova" },
  { nome: "Valdirene Borcem", bairro: "Pratinha" },
  { nome: "Dirceu Rodrigo", bairro: "Marituba" },
  { nome: "Matheus Pitagoras", bairro: "Maguari" },
  { nome: "Abimael Corrêa", bairro: "Pedreira" },
  { nome: "Patricia Machado", bairro: "Pedreira" },
  { nome: "Mauro Cj", bairro: "maguari" },
  { nome: "Bruno Gay", bairro: "Bengui" },
  { nome: "Jose Santana", bairro: "Jurunas" },
  { nome: "Raiza Costa", bairro: "Jurunas" },
  { nome: "Waldiney Santos", bairro: "Cidade Nova" },
  { nome: "Benivaldo", bairro: "Jurunas" },
  { nome: "Sandra Ferreira", bairro: "Castanhal" },
  { nome: "Negão", bairro: "Gordim" },
  { nome: "Cristhian", bairro: "Marajó" },
  { nome: "Lenir", bairro: "Benfica" },
  { nome: "Tailana", bairro: "Benfica" },
  { nome: "Aldenour", bairro: "Castanhal" },
  { nome: "Arlete", bairro: "Gordim" },
  { nome: "Vitor Aura", bairro: "Aura" },
  { nome: "Gustavo Ramos", bairro: "Cidade Nova" },
  { nome: "Cleber Bianor", bairro: "Mosqueiro" },
  { nome: "Rubens Drago", bairro: "Cdp" },
  { nome: "Orivaldo Amaral", bairro: "Canudos" },
  { nome: "Francisco figueiredo", bairro: "Aurá" },
  { nome: "Rosinaldo Barbosa", bairro: "Jurunas" },
  { nome: "Andrey Da Silva", bairro: "Bengui" },
  { nome: "Luiz Evangelista", bairro: "Distrito" },
  { nome: "Walter Damasceno", bairro: "Tenoné" },
  { nome: "Sandres", bairro: "Centro" },
  { nome: "Alisson Antonio", bairro: "Guamá" },
  { nome: "Edgar Henrique", bairro: "Coqueiro" },
  { nome: "Rafael de Vilhena", bairro: "Aguas Lindas" },
  { nome: "Regina Leão", bairro: "Condor" },
  { nome: "Kauel Lisboa", bairro: "Marco" },
  { nome: "Ailton Souza", bairro: "Cidade Nova 8" },
  { nome: "Rui Guilherme", bairro: "Jurunas" },
  { nome: "Tina Charles", bairro: "Bujaru" },
  { nome: "Gamaliel Tarsos", bairro: "Bragança" },
  { nome: "Rubenildo Miranda", bairro: "Centro" },
  { nome: "Rosivaldo (tilo)", bairro: "Marajo" },
  { nome: "Adilio Rodrigues", bairro: "Combu" },
  { nome: "Rogerio Silva", bairro: "Inhangapi" },
  { nome: "Eliezer Cardoso", bairro: "Castanheira" },
  { nome: "Julio Cezar", bairro: "Condor" },
  { nome: "Pablo Neves (Goiano)", bairro: "Castanhal" },
  { nome: "Osimar Alves", bairro: "Mosqueiro" },
  { nome: "Monica Souza", bairro: "Bengui" },
  { nome: "Mauro Marcelo", bairro: "Combu" },
  { nome: "Carlos Eduardo", bairro: "Guama" },
  { nome: "Arnaldo Cruz", bairro: "Marituba" },
  { nome: "Andre Luiz", bairro: "Curuça" },
  { nome: "Robson Gonçalves", bairro: "Marambaia" },
  { nome: "Jair", bairro: "Cidade nova" },
  { nome: "Basileu Júnior", bairro: "Jurunas" },
  { nome: "Robson Alexandre", bairro: "Canudos" },
  { nome: "Adailton Costa", bairro: "40 Horas" },
  { nome: "Carlos Alberto", bairro: "Castanheira" },
  { nome: "Maria das Graças", bairro: "Cidade Nova" },
  { nome: "Andrey Miranda", bairro: "Pratinha" },
  { nome: "Rafaela Nascimento", bairro: "Aurá" },
  { nome: "Cleyton", bairro: "Tenone" },
  { nome: "Wagner Huelton", bairro: "Tapajos" },
  { nome: "Laerson Alves", bairro: "Bengui" },
  { nome: "Izac Do Nascimento", bairro: "Terra Firme" },
  { nome: "Raimundo Nonato", bairro: "Icoaraci" },
  { nome: "Socorro Batista", bairro: "Marajo" },
  { nome: "Kleber", bairro: "Icoaraci" },
  { nome: "Vania Pampolha", bairro: "Coqueiro" },
  { nome: "Mario Sergio", bairro: "Pedreira" },
  { nome: "Cezar Assis", bairro: "(goiano)" },
  { nome: "Jean Carlos", bairro: "Jurunas" },
  { nome: "Artur dos Santos", bairro: "Mosqueiro" },
  { nome: "Fabio", bairro: "Barreiro" },
  { nome: "Lucivaldo Souza", bairro: "Telegrafo" },
  { nome: "Bare", bairro: "Marajó" },
  { nome: "Mario Sergio (cunhado)", bairro: "Pedreira" },
  { nome: "Elton Lopes", bairro: "Barreiro" },
  { nome: "Maurício Pontes", bairro: "Nazaré" },
  { nome: "Rodrigo Ribeiro", bairro: "Maguari" },
  { nome: "Paula Cidade", bairro: "nova 2" },
  { nome: "Aurea Sousa", bairro: "Bengui" },
  { nome: "Joao Duarte", bairro: "Curuça" },
  { nome: "Ajacson", bairro: "Marajó" },
  { nome: "Benedito Nunes", bairro: "Abaetetuba" },
  { nome: "Guilherme França", bairro: "Cremação" },
  { nome: "Jose Carlos Souza", bairro: "Curuça" },
  { nome: "Cady (tilo)", bairro: "Marajo" },
  { nome: "André da Silva", bairro: "Almirante" },
  { nome: "Waldiney de Souza", bairro: "Guama" },
  { nome: "Simone Lopes", bairro: "Mario covas" },
  { nome: "Valeria Navegante (tilo)", bairro: "Marajo" },
  { nome: "Gel", bairro: "(Gordim)" },
  { nome: "Jonas Farias (tilo)", bairro: "Marajo" },
  { nome: "Luciana Carvalho (tilo)", bairro: "Marajo" },
  { nome: "Maria José", bairro: "Umarizal" },
  { nome: "Marcos Antonio", bairro: "Bujaru" },
  { nome: "Tedd Kennedy", bairro: "Jurunas" },
  { nome: "Pedro Paixão", bairro: "Mosqueiro" },
  { nome: "Vanderlei Do Socorro", bairro: "Mosqueiro" },
  { nome: "Pedro Paulo (edinei)", bairro: "Taua" },
  { nome: "Quartel De Polícia", bairro: "Marajo" },
  { nome: "Mauro Silva", bairro: "Castanhal " },
  { nome: "Thais", bairro: "Distrito" },
  { nome: "Paulo Roberto", bairro: "Jurunas" },
  { nome: "Raimundo Sales", bairro: "Curio" },
  { nome: "Wladimir Viegas", bairro: "Jurunas" },
  { nome: "Walter de Jesus", bairro: "Sevilha" },
  { nome: "Waldir Saldanha", bairro: "Murinin" },
  { nome: "Wagner Araújo", bairro: "Barcarena" },
  { nome: "Vanessa Nunes", bairro: "Murinin" },
  { nome: "Sidney", bairro: "Cidade Nova" },
  { nome: "Sandro", bairro: "marajo (tilo)" },
  { nome: "Ruy Villar", bairro: "Reduto" },
  { nome: "Rozivaldo Sales", bairro: "Bujaru" },
  { nome: "Rosa Maria", bairro: "Cotijuba" },
  { nome: "Rogerio", bairro: "Mangueirão" },
  { nome: "Rodrigo Lopes", bairro: "Cordeiro" },
  { nome: "Roberto Henrique", bairro: "Marituba" },
  { nome: "Rita Bairro", bairro: "Atalaia" },
  { nome: "Renee de Abreu", bairro: "Icoaraci" },
  { nome: "Remilson dos santos", bairro: "Tenoné" },
  { nome: "Raimundo Nonato", bairro: "Tapanã" },
  { nome: "Paulo André", bairro: "Ananindeua" },
  { nome: "Octavio de Jesus", bairro: "Castanheira" },
  { nome: "Nilda Assis (goiano)", bairro: "Castanhal" },
  { nome: "Naif Antonio", bairro: "Cabanagem" },
  { nome: "Mauro", bairro: "Aguas Lindas" },
  { nome: "Márcia Assis (goiano)", bairro: "Castanhal" },
  { nome: "Luiz Carlos", bairro: "águas brancas" },
  { nome: "Lucineia", bairro: "Coqueiro" },
  { nome: "Lucimar", bairro: "Centro Ananideua" },
  { nome: "Luciano", bairro: "Augusto Montenegro" },
  { nome: "Lauro Lima", bairro: "Mosqueiro" },
  { nome: "Laura", bairro: "(Gordim)" },
  { nome: "Laise elane", bairro: "Rios Pará" },
  { nome: "Laiane Santos", bairro: "Nazaré" },
  { nome: "Keila Cristina", bairro: "Sacramenta" },
  { nome: "Julia Carvalho", bairro: "Telegrafo" },
  { nome: "Jucival da Costa", bairro: "Sacramenta" },
  { nome: "Josivaldo", bairro: "Marituba" },
  { nome: "Joseane Aracaty", bairro: "Outeiro" },
  { nome: "João Fernandes", bairro: "Mosqueiro" },
  { nome: "João Batista", bairro: "Castanhal" },
  { nome: "Joane Maia", bairro: "Jurunas" },
  { nome: "Isael Souza", bairro: "Combu" },
  { nome: "Iderson", bairro: "Pedreira" },
  { nome: "Glauber", bairro: "Parque Verde" },
  { nome: "Gerson Matos", bairro: "Marajó" },
  { nome: "Gerson (Loly Silva)", bairro: "São Braz" },
  { nome: "Gabriel", bairro: "Bujaru" },
  { nome: "Francisco Jorge", bairro: "Barcarena" },
  { nome: "Francisco (Pai samia)", bairro: "Pratinha" },
  { nome: "Fernando Sergio", bairro: "Marco" },
  { nome: "Fernando", bairro: "Outeiro" },
  { nome: "Fábio Anderson", bairro: "Marajó" },
  { nome: "Evaristo Porfirio", bairro: "Coqueiro" },
  { nome: "Enedina", bairro: "Marambaia" },
  { nome: "Eliana de Fátima", bairro: "Salinas" },
  { nome: "Edsom", bairro: "icui" },
  { nome: "Edinei Cardoso", bairro: "Taua" },
  { nome: "Duzivaldo Miranda", bairro: "Guamá" },
  { nome: "Diogo Silva", bairro: "Marambaia" },
  { nome: "Dilson Pamplona", bairro: "Curuca" },
  { nome: "Daniela Santos", bairro: "Maguari" },
  { nome: "Daniel", bairro: "Paar" },
  { nome: "Cristiano Dias", bairro: "Portel Marajó" },
  { nome: "Claudia Coelho", bairro: "Aguas Lindas" },
  { nome: "Charles dos Santos", bairro: "Mosqueiro" },
  { nome: "Carlos Vitor", bairro: "Marambaia" },
  { nome: "Bruno Carvalho", bairro: "Jurunas" },
  { nome: "Beraldo Seixas", bairro: "Mosqueiro" },
  { nome: "Arnaldo Pereira", bairro: "Mario Covas" },
  { nome: "Arlison", bairro: "Val de Cans" },
  { nome: "Antônio Carlos", bairro: "Maguari" },
  { nome: "Antonio Cardoso", bairro: "Salinas" },
  { nome: "Antônio Batista", bairro: "Icui" },
  { nome: "Angela Maria", bairro: "Sacramenta" },
  { nome: "Ana Maria", bairro: "Jurunas" },
  { nome: "Alessandra", bairro: "Marambaia" },
  { nome: "Wellington", bairro: "Humaita" },
  { nome: "Waldson Luiz", bairro: "Marituba" },
  { nome: "Vinicius Gouveia", bairro: "Telegrafo" },
  { nome: "Thiago", bairro: "Jurunas" },
  { nome: "Samila", bairro: "Guerra Passos" },
  { nome: "Salomão Goes", bairro: "Paar" },
  { nome: "Saba", bairro: "condor" },
  { nome: "Ruth", bairro: "Outeiro" },
  { nome: "Ruberval Macapuna", bairro: "Salinas" },
  { nome: "Romulo Marcelo", bairro: "Marituba" },
  { nome: "Romulo Corrêa", bairro: "Mangueirao" },
  { nome: "Rodrigo Costa", bairro: "Marajo" },
  { nome: "Robson Félix", bairro: "Pratinha 1" },
  { nome: "Roberto", bairro: "Umarizal" },
  { nome: "Ricardo de Assis", bairro: "Jurunas" },
  { nome: "Ricardo", bairro: "Tapanã" },
  { nome: "Renato Casanova", bairro: "Benfica" },
  { nome: "Raysa", bairro: "Coqueiro" },
  { nome: "Raimundo", bairro: "Marituba (Gordim)" },
  { nome: "Raimunda Costa", bairro: "Jurunas" },
  { nome: "Rafael Costa", bairro: "Icoaraci" },
  { nome: "Pedro Novas", bairro: "Marco" },
  { nome: "Paulo PatricK", bairro: "Terra Firme" },
  { nome: "Paula", bairro: "Cidade nova 2" },
  { nome: "PAI Andrey", bairro: "Guamá" },
  { nome: "Osiel Lima", bairro: "Telégrafo" },
  { nome: "Newton Lima", bairro: "Curuçá" },
  { nome: "Marlon", bairro: "Distrito" },
  { nome: "Marcos Batista", bairro: "Campos" },
  { nome: "Marcos", bairro: "Pedreira" },
  { nome: "Luiz", bairro: "Benfica" },
  { nome: "Leandro Pacífica", bairro: "Guama" },
  { nome: "Juscelino Pereira", bairro: "40 horas" },
  { nome: "junielson Maia", bairro: "Portel Marajó" },
  { nome: "Jorge Luis", bairro: "Santa Isabel" },
  { nome: "Jorge do Socorro", bairro: "Jurunas" },
  { nome: "Joelbsom Neris", bairro: "Jurunas" },
  { nome: "Jessica Barbosa", bairro: "icoaraci" },
  { nome: "Ivan Martins", bairro: "Mosqueiro" },
  { nome: "Gleidson", bairro: "Distrito" },
  { nome: "Fabio José", bairro: "Tapanã" },
  { nome: "Evandro", bairro: "Jurunas" },
  { nome: "Edgar ambé", bairro: "Icoaraci" },
  { nome: "Dona Joana", bairro: "Bengui" },
  { nome: "Delival De Miranda", bairro: "Acará" },
  { nome: "Celso", bairro: "Tapanã" },
  { nome: "Carlos Ferreira", bairro: "Condor" },
  { nome: "Carlos Dias", bairro: "Salinas" },
  { nome: "Carlos", bairro: "Reduto" },
  { nome: "Bita jurunas", bairro: "Jurunas (DELL)" },
  { nome: "Benedito Ribeiro", bairro: "Cremação" },
  { nome: "Andreza", bairro: "Jurunas" },
  { nome: "Andrey Pantoja", bairro: "Tenoné" },
  { nome: "Andre Souza", bairro: "Tapanã" },
  { nome: "Andre Aragão", bairro: "Castanheira" },
  { nome: "Alisson", bairro: "Sevilha" },
  { nome: "Alex Santiago", bairro: "Atalaia" },
  { nome: "Alberto Carlos", bairro: "Bela vista 2" },
  { nome: "Washington Alain", bairro: "Parque Sul" },
  { nome: "Valner Vasconcelos", bairro: "Buenos Aires" },
  { nome: "Raimundo Nonato Teresina", bairro: "São João" },
  { nome: "Rafael Soares", bairro: "Lorival Parente" },
  { nome: "Quitanda Chopperia", bairro: "Cocais" },
  { nome: "Milton Alves", bairro: "Vila Operaria" },
  { nome: "Marina Melo", bairro: "Soturno" },
  { nome: "Maria Celina", bairro: "Morada Nova" },
  { nome: "Marcos Roberto", bairro: "Torquato" },
  { nome: "Marcio Rogerio", bairro: "Vila" },
  { nome: "Marcio Oliveira", bairro: "Timon" },
  { nome: "Marcelo", bairro: "Boa Vista" },
  { nome: "Manoel de Pádua", bairro: "Horto Florestal" },
  { nome: "Luiza Absolon", bairro: "São Pedro" },
  { nome: "Luh Andrade", bairro: "Piçarreira" },
  { nome: "Lucas Vaz", bairro: "Vale Quem Tem" },
  { nome: "Lenildes", bairro: "Aeroporto" },
  { nome: "Lailton Oliveira", bairro: "Vila Da Águia" },
  { nome: "Joselina Inácio", bairro: "Parque Poti" },
  { nome: "José Percílio", bairro: "Bairro De Fátima" },
  { nome: "José Orlando", bairro: "Bar" },
  { nome: "Jorge Henrique", bairro: "Parque Alvorada" },
  { nome: "Jivago Nobre", bairro: "Vale Quem Tem" },
  { nome: "Jardel Barbosa", bairro: "Bairro De Fátima" },
  { nome: "Jackson Dos Santos", bairro: "Bela Vista" },
  { nome: "Ítalo Rafael", bairro: "Soturno" },
  { nome: "Hudson Pires", bairro: "Porto Alegre" },
  { nome: "Gutemberg Ferreira", bairro: "(Cláudio)" },
  { nome: "Gustavo de Sousa", bairro: "Timon" },
  { nome: "Gilmar Viana", bairro: "Bom Principio" },
  { nome: "Geovane Carlos", bairro: "Jardim Europa" },
  { nome: "Francisco Pereira", bairro: "Parque Piauí 1" },
  { nome: "Francisco Jhone", bairro: "Cajueiro" },
  { nome: "Francisco Jefisson", bairro: "Novo horizonte" },
  { nome: "Francisco Eduardo", bairro: "Taquari" },
  { nome: "Francisco Brendo", bairro: "Tabajaras" },
  { nome: "Evandro de Souza", bairro: "Centro" },
  { nome: "Eduardo Damasceno", bairro: "Aeroporto" },
  { nome: "Darlan Furtado", bairro: "Fátima" },
  { nome: "Daniel Cesar", bairro: "Portal Da Alegria" },
  { nome: "Cristemberre Camelo", bairro: "Mocambinho" },
  { nome: "Claudio", bairro: "Pastel" },
  { nome: "Carlos Moreira", bairro: "São João" },
  { nome: "Carlito Gomes", bairro: "Parque Piauí" },
  { nome: "Bruno Mikael", bairro: "Vale do Gaviao" },
  { nome: "Antonio Wellington", bairro: "Campestre" },
  { nome: "Antonio Silva", bairro: "Pedra Mole" },
  { nome: "Ana Raquel", bairro: "Deus Quer" },
  { nome: "Alex Luiz", bairro: "Dirceu" },
  { nome: "Adriano Cezar", bairro: "Matadouro" }
];

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function compararNomes(nome1, nome2) {
  const n1 = normalizarTexto(nome1);
  const n2 = normalizarTexto(nome2);
  if (n1 === n2) return true;
  const p1 = n1.split(' ');
  const p2 = n2.split(' ');
  let coinc = 0;
  for (const p of p1) if (p.length > 2 && p2.includes(p)) coinc++;
  return coinc >= 2;
}

function compararBairros(b1, b2) {
  const n1 = normalizarTexto(b1);
  const n2 = normalizarTexto(b2);
  if (!n1 && !n2) return true;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  const alias = {
    guama: ['guama', 'guamá'],
    telegrafo: ['telegrafo', 'telégrafo', 'télegrafo'],
    tenone: ['tenone', 'tenoné'],
    maguari: ['maguari'],
    gordim: ['gordim', 'gordin'],
    marajo: ['marajo', 'marajó'],
    tapanã: ['tapanã', 'tapana'],
    aguas: ['aguas', 'águas'],
  };
  for (const v of Object.values(alias)) {
    if (v.includes(n1) && v.includes(n2)) return true;
  }
  return false;
}

async function compararClientes() {
  console.log('🚀 Iniciando comparação de clientes ativos...');

  // Buscar clientes ativos do Firestore
  const snap = await db.collection('clientes').where('status', '==', 'ativo').get();
  const clientesAtivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`💻 Clientes ativos no sistema: ${clientesAtivos.length}`);

  const encontrados = [];
  const naoEncontrados = [];
  const sistemaNaoNaLista = [];

  // Índice rápido por nome normalizado -> array
  const indexSistema = new Map();
  for (const c of clientesAtivos) {
    const key = normalizarTexto(c.nome || c.nomeCompleto || '');
    if (!indexSistema.has(key)) indexSistema.set(key, []);
    indexSistema.get(key).push(c);
  }

  // Verificar os que estão na lista mas não no sistema
  for (const item of listaFornecida) {
    const key = normalizarTexto(item.nome);
    const candidatos = indexSistema.get(key) || clientesAtivos;
    let achou = false;
    for (const c of candidatos) {
      if (compararNomes(item.nome, c.nome || c.nomeCompleto || '') && compararBairros(item.bairro, c.bairro || c.endereco?.bairro || '')) {
        encontrados.push({ lista: item, sistema: { id: c.id, nome: c.nome, bairro: c.bairro || c.endereco?.bairro || '' } });
        achou = true;
        break;
      }
    }
    if (!achou) naoEncontrados.push(item);
  }

  // Verificar os que estão no sistema mas não na lista
  for (const c of clientesAtivos) {
    let achou = false;
    for (const item of listaFornecida) {
      if (compararNomes(item.nome, c.nome || c.nomeCompleto || '') && compararBairros(item.bairro, c.bairro || c.endereco?.bairro || '')) {
        achou = true;
        break;
      }
    }
    if (!achou) sistemaNaoNaLista.push({ id: c.id, nome: c.nome, bairro: c.bairro || c.endereco?.bairro || '' });
  }

  // Relatório
  const relatorio = {
    geradoEm: new Date().toISOString(),
    resumo: {
      totalLista: listaFornecida.length,
      totalAtivosSistema: clientesAtivos.length,
      encontrados: encontrados.length,
      naoEncontrados: naoEncontrados.length,
      sistemaNaoNaLista: sistemaNaoNaLista.length,
    },
    encontrados,
    naoEncontrados,
    sistemaNaoNaLista,
  };

  const arquivo = path.join(process.cwd(), `relatorio-comparacao-clientes-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(relatorio, null, 2));

  console.log('\n📊 RESUMO');
  console.log(relatorio.resumo);
  console.log(`\n💾 Relatório salvo em: ${arquivo}`);
}

if (require.main === module) {
  compararClientes().then(() => {
    console.log('🏁 Concluído');
  }).catch(err => {
    console.error('❌ Erro', err);
    process.exit(1);
  });
}

module.exports = { compararClientes };
