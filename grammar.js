// Português Drill - grammar data: verbs, contractions and the grammar notes.
// Loaded by index.html with <script src="grammar.js"> (after vocab.js); the
// app reads window.PT_DRILL_GRAMMAR. Kept apart from the app code for the same
// reason as vocab.js: the content can grow without touching the engine.
//
// VERBS
//   inf        the infinitive
//   group      'ar' | 'er' | 'ir' (the regular pattern it follows) or 'irr'
//   en         English forms for the prompts: [base, he/she form, past, -ing]
//              e.g. ['speak', 'speaks', 'spoke', 'speaking']. 'be' is special.
//   enImp      (optional) English for "was / used to" if "used to <base>" reads badly
//   enFut      (optional) English base after "going to" if different
//   forms      (optional) overrides, by tense, five forms each in person order
//              eu, tu, ele/ela/você, nós, eles/elas/vocês. null = follow the
//              regular pattern. "a|b" = a is shown, both are accepted.
//   skip       (optional) tenses this verb isn't drilled in (sounds wrong)
//   notes      (optional) a note shown after answering, by tense
// The app builds every form not listed from the regular endings (and the
// -car/-gar/-çar spelling changes in the past), and builds the two
// compound tenses from estar a + infinitive and ir + infinitive.
//
// Scores are keyed on infinitive + tense + person, so editing a form keeps
// its score.
window.PT_DRILL_GRAMMAR = {
  persons: [
    { pt: 'eu', en: 'I' },
    { pt: 'tu', en: 'you' },
    { pt: 'ele/ela', en: 'he/she' },
    { pt: 'nós', en: 'we' },
    { pt: 'eles/elas', en: 'they' },
  ],
  tenses: [
    { key: 'pres', label: 'Present', hint: 'now / usually' },
    { key: 'pret', label: 'Past', hint: 'did' },
    { key: 'imp', label: 'Was / used to', hint: 'was doing / used to' },
    { key: 'prog', label: 'Right now', hint: 'estar a …' },
    { key: 'fut', label: 'Going to', hint: 'ir + …' },
  ],
  verbs: [
    // ---- Irregular (the ones that matter most) ----
    { inf: 'ser', group: 'irr', en: ['be', 'is', 'was', 'being'], enImp: 'used to be', skip: ['prog'],
      forms: { pres: ['sou', 'és', 'é', 'somos', 'são'], pret: ['fui', 'foste', 'foi', 'fomos', 'foram'], imp: ['era', 'eras', 'era', 'éramos', 'eram'] },
      notes: { pret: 'The past of ser and ir is the same: fui = I was / I went.' } },
    { inf: 'estar', group: 'irr', en: ['be', 'is', 'was', 'being'], enImp: 'used to be', skip: ['prog'],
      forms: { pres: ['estou', 'estás', 'está', 'estamos', 'estão'], pret: ['estive', 'estiveste', 'esteve', 'estivemos', 'estiveram'] } },
    { inf: 'ter', group: 'irr', en: ['have', 'has', 'had', 'having'], skip: ['prog'],
      forms: { pres: ['tenho', 'tens', 'tem', 'temos', 'têm'], pret: ['tive', 'tiveste', 'teve', 'tivemos', 'tiveram'], imp: ['tinha', 'tinhas', 'tinha', 'tínhamos', 'tinham'] },
      notes: { pres: 'tem (he/she has) and têm (they have) sound the same in Portugal.' } },
    { inf: 'ir', group: 'irr', en: ['go', 'goes', 'went', 'going'], skip: ['prog', 'fut'],
      forms: { pres: ['vou', 'vais', 'vai', 'vamos', 'vão'], pret: ['fui', 'foste', 'foi', 'fomos', 'foram'], imp: ['ia', 'ias', 'ia', 'íamos', 'iam'] },
      notes: { pret: 'The past of ir and ser is the same: fui = I went / I was.' } },
    { inf: 'vir', group: 'irr', en: ['come', 'comes', 'came', 'coming'],
      forms: { pres: ['venho', 'vens', 'vem', 'vimos', 'vêm'], pret: ['vim', 'vieste', 'veio', 'viemos', 'vieram'], imp: ['vinha', 'vinhas', 'vinha', 'vínhamos', 'vinham'] },
      notes: { pres: 'Careful: vimos is "we come" here - and also "we saw" (from ver).' } },
    { inf: 'fazer', group: 'irr', en: ['do', 'does', 'did', 'doing'],
      forms: { pres: ['faço', 'fazes', 'faz', 'fazemos', 'fazem'], pret: ['fiz', 'fizeste', 'fez', 'fizemos', 'fizeram'] } },
    { inf: 'dizer', group: 'irr', en: ['say', 'says', 'said', 'saying'],
      forms: { pres: ['digo', 'dizes', 'diz', 'dizemos', 'dizem'], pret: ['disse', 'disseste', 'disse', 'dissemos', 'disseram'] } },
    { inf: 'poder', group: 'irr', en: ['can', 'can', 'could', 'being able to'], enImp: 'used to be able to', enFut: 'be able to', skip: ['prog'],
      forms: { pres: ['posso', 'podes', 'pode', 'podemos', 'podem'], pret: ['pude', 'pudeste', 'pôde', 'pudemos', 'puderam'] },
      notes: { pret: 'pôde (he could, past) has a hat; pode (he can, present) doesn\'t.' } },
    { inf: 'querer', group: 'irr', en: ['want', 'wants', 'wanted', 'wanting'], skip: ['prog'],
      forms: { pres: ['quero', 'queres', 'quer', 'queremos', 'querem'], pret: ['quis', 'quiseste', 'quis', 'quisemos', 'quiseram'] },
      notes: { imp: 'queria is also the polite "I\'d like": queria um café.' } },
    { inf: 'saber', group: 'irr', en: ['know', 'knows', 'knew', 'knowing'], skip: ['prog'],
      forms: { pres: ['sei', 'sabes', 'sabe', 'sabemos', 'sabem'], pret: ['soube', 'soubeste', 'soube', 'soubemos', 'souberam'] },
      notes: { pret: 'In the past, soube usually means "found out".' } },
    { inf: 'conhecer', group: 'irr', en: ['know (a person or place)', 'knows (a person or place)', 'met', 'knowing'], enImp: 'used to know (a person or place)', skip: ['prog'],
      forms: { pres: ['conheço', null, null, null, null] },
      notes: { pret: 'In the past, conheci usually means "I met (for the first time)".' } },
    { inf: 'ver', group: 'irr', en: ['see', 'sees', 'saw', 'seeing'],
      forms: { pres: ['vejo', 'vês', 'vê', 'vemos', 'veem'], pret: ['vi', 'viste', 'viu', 'vimos', 'viram'] } },
    { inf: 'dar', group: 'irr', en: ['give', 'gives', 'gave', 'giving'],
      forms: { pres: ['dou', 'dás', 'dá', 'damos', 'dão'], pret: ['dei', 'deste', 'deu', 'demos', 'deram'] } },
    { inf: 'pôr', group: 'irr', en: ['put', 'puts', 'put', 'putting'],
      forms: { pres: ['ponho', 'pões', 'põe', 'pomos', 'põem'], pret: ['pus', 'puseste', 'pôs', 'pusemos', 'puseram'], imp: ['punha', 'punhas', 'punha', 'púnhamos', 'punham'] } },
    { inf: 'trazer', group: 'irr', en: ['bring', 'brings', 'brought', 'bringing'],
      forms: { pres: ['trago', 'trazes', 'traz', 'trazemos', 'trazem'], pret: ['trouxe', 'trouxeste', 'trouxe', 'trouxemos', 'trouxeram'] } },
    { inf: 'ler', group: 'irr', en: ['read', 'reads', 'read', 'reading'],
      forms: { pres: ['leio', 'lês', 'lê', 'lemos', 'leem'], pret: ['li', 'leste', 'leu', 'lemos', 'leram'] } },
    { inf: 'sair', group: 'irr', en: ['go out', 'goes out', 'went out', 'going out'],
      forms: { pres: ['saio', 'sais', 'sai', 'saímos', 'saem'], pret: ['saí', 'saíste', 'saiu', 'saímos', 'saíram'], imp: ['saía', 'saías', 'saía', 'saíamos', 'saíam'] } },
    { inf: 'ouvir', group: 'irr', en: ['hear', 'hears', 'heard', 'hearing'],
      forms: { pres: ['ouço|oiço', null, null, null, null] },
      notes: { pres: 'oiço is just as common as ouço in Portugal.' } },
    { inf: 'pedir', group: 'irr', en: ['order', 'orders', 'ordered', 'ordering'],
      forms: { pres: ['peço', null, null, null, null] },
      notes: { pres: 'pedir is to ask FOR something; perguntar is to ask a question.' } },
    { inf: 'dormir', group: 'irr', en: ['sleep', 'sleeps', 'slept', 'sleeping'],
      forms: { pres: ['durmo', null, null, null, null] } },
    { inf: 'preferir', group: 'irr', en: ['prefer', 'prefers', 'preferred', 'preferring'], skip: ['prog'],
      forms: { pres: ['prefiro', null, null, null, null] } },

    // ---- Regular -ar ----
    { inf: 'falar', group: 'ar', en: ['speak', 'speaks', 'spoke', 'speaking'] },
    { inf: 'trabalhar', group: 'ar', en: ['work', 'works', 'worked', 'working'] },
    { inf: 'morar', group: 'ar', en: ['live', 'lives', 'lived', 'living'] },
    { inf: 'gostar', group: 'ar', en: ['like', 'likes', 'liked', 'liking'], skip: ['prog'],
      notes: { pres: 'Always gostar de: gosto de vinho, gosto do Porto.', imp: 'gostava de is also the polite "I\'d like": gostava de um café.' } },
    { inf: 'comprar', group: 'ar', en: ['buy', 'buys', 'bought', 'buying'] },
    { inf: 'pagar', group: 'ar', en: ['pay', 'pays', 'paid', 'paying'] },
    { inf: 'chegar', group: 'ar', en: ['arrive', 'arrives', 'arrived', 'arriving'] },
    { inf: 'ficar', group: 'ar', en: ['stay', 'stays', 'stayed', 'staying'] },
    { inf: 'começar', group: 'ar', en: ['start', 'starts', 'started', 'starting'] },
    { inf: 'tomar', group: 'ar', en: ['have (a drink)', 'has (a drink)', 'had (a drink)', 'having (a drink)'] },
    { inf: 'levar', group: 'ar', en: ['take', 'takes', 'took', 'taking'] },
    { inf: 'voltar', group: 'ar', en: ['come back', 'comes back', 'came back', 'coming back'] },
    { inf: 'esperar', group: 'ar', en: ['wait', 'waits', 'waited', 'waiting'] },
    { inf: 'ajudar', group: 'ar', en: ['help', 'helps', 'helped', 'helping'] },
    { inf: 'apanhar', group: 'ar', en: ['catch', 'catches', 'caught', 'catching'] },
    { inf: 'procurar', group: 'ar', en: ['look for', 'looks for', 'looked for', 'looking for'] },
    { inf: 'encontrar', group: 'ar', en: ['find', 'finds', 'found', 'finding'] },
    { inf: 'pensar', group: 'ar', en: ['think', 'thinks', 'thought', 'thinking'] },
    { inf: 'viajar', group: 'ar', en: ['travel', 'travels', 'travelled', 'travelling'] },
    { inf: 'perguntar', group: 'ar', en: ['ask', 'asks', 'asked', 'asking'] },
    { inf: 'jantar', group: 'ar', en: ['have dinner', 'has dinner', 'had dinner', 'having dinner'] },
    { inf: 'almoçar', group: 'ar', en: ['have lunch', 'has lunch', 'had lunch', 'having lunch'] },
    { inf: 'estudar', group: 'ar', en: ['study', 'studies', 'studied', 'studying'] },
    { inf: 'precisar', group: 'ar', en: ['need', 'needs', 'needed', 'needing'], skip: ['prog'],
      notes: { pres: 'Always precisar de: preciso de ajuda.' } },

    // ---- Regular -er ----
    { inf: 'comer', group: 'er', en: ['eat', 'eats', 'ate', 'eating'] },
    { inf: 'beber', group: 'er', en: ['drink', 'drinks', 'drank', 'drinking'] },
    { inf: 'aprender', group: 'er', en: ['learn', 'learns', 'learnt', 'learning'] },
    { inf: 'escrever', group: 'er', en: ['write', 'writes', 'wrote', 'writing'] },
    { inf: 'perceber', group: 'er', en: ['understand', 'understands', 'understood', 'understanding'], skip: ['prog'] },
    { inf: 'vender', group: 'er', en: ['sell', 'sells', 'sold', 'selling'] },

    // ---- Regular -ir ----
    { inf: 'abrir', group: 'ir', en: ['open', 'opens', 'opened', 'opening'] },
    { inf: 'partir', group: 'ir', en: ['leave (set off)', 'leaves (sets off)', 'left (set off)', 'leaving (setting off)'] },
    { inf: 'decidir', group: 'ir', en: ['decide', 'decides', 'decided', 'deciding'] },
  ],

  // CONTRACTIONS - preposition + article/word, drilled inside a sentence.
  // ___ marks the gap.
  contractions: [
    { parts: 'em + o', answer: 'no', pt: 'Estou ___ hotel.', en: "I'm at the hotel." },
    { parts: 'em + a', answer: 'na', pt: 'Moro ___ Baixa.', en: 'I live downtown.' },
    { parts: 'em + os', answer: 'nos', pt: 'Há muitos turistas ___ museus.', en: 'There are lots of tourists in the museums.' },
    { parts: 'em + as', answer: 'nas', pt: 'Vendem sardinhas ___ festas.', en: 'They sell sardines at the festivals.' },
    { parts: 'em + um', answer: 'num', pt: 'Moro ___ apartamento.', en: 'I live in a flat.' },
    { parts: 'em + uma', answer: 'numa', pt: 'Almoçámos ___ esplanada.', en: 'We had lunch on a café terrace.' },
    { parts: 'em + este', answer: 'neste', pt: 'Fico ___ hotel.', en: "I'm staying in this hotel." },
    { parts: 'em + esse', answer: 'nesse', pt: '___ dia estava a chover.', en: 'That day it was raining.' },
    { parts: 'em + aquele', answer: 'naquele', pt: 'Trabalhava ___ café.', en: 'I used to work in that café.' },
    { parts: 'de + o', answer: 'do', pt: 'Sou ___ Reino Unido.', en: "I'm from the UK." },
    { parts: 'de + a', answer: 'da', pt: 'A casa ___ Ana é perto.', en: "Ana's house is nearby." },
    { parts: 'de + os', answer: 'dos', pt: 'Qual é o preço ___ bilhetes?', en: "What's the price of the tickets?" },
    { parts: 'de + as', answer: 'das', pt: 'Gosto ___ praias.', en: 'I like the beaches.' },
    { parts: 'de + este', answer: 'deste', pt: 'Gosto ___ vinho.', en: 'I like this wine.' },
    { parts: 'de + esse', answer: 'desse', pt: 'Preciso ___ mapa.', en: 'I need that map.' },
    { parts: 'de + ele', answer: 'dele', pt: 'É o carro ___.', en: "It's his car." },
    { parts: 'de + ela', answer: 'dela', pt: 'É a mala ___.', en: "It's her bag." },
    { parts: 'de + aqui', answer: 'daqui', pt: 'É longe ___?', en: 'Is it far from here?' },
    { parts: 'a + o', answer: 'ao', pt: 'Vou ___ museu.', en: "I'm going to the museum." },
    { parts: 'a + a', answer: 'à', pt: 'Vou ___ praia.', en: "I'm going to the beach." },
    { parts: 'a + os', answer: 'aos', pt: 'Vamos ___ Açores.', en: "We're going to the Azores." },
    { parts: 'a + as', answer: 'às', pt: 'O jantar é ___ oito.', en: 'Dinner is at eight.' },
    { parts: 'a + aquele', answer: 'àquele', pt: 'Vamos ___ restaurante.', en: "Let's go to that restaurant." },
    { parts: 'por + o', answer: 'pelo', pt: 'Passamos ___ centro.', en: 'We go through the centre.' },
    { parts: 'por + a', answer: 'pela', pt: 'Obrigado ___ ajuda.', en: 'Thanks for the help.' },
    { parts: 'por + os', answer: 'pelos', pt: 'Obrigado ___ conselhos.', en: 'Thanks for the advice.' },
    { parts: 'por + as', answer: 'pelas', pt: 'Chego ___ dez.', en: "I'll get there around ten." },
  ],


  // SENTENCES (rebuilt 2026-10-11, modelled on the Japanese L3 generator):
  // independent slots - who, when, where, with whom, how, what - mixed by the
  // app, with simple sense rules so every combination is something a person
  // would actually say. Verb forms come from the verbs above; contractions
  // (ao, à, no, na, do, da…) and adjective agreement are done by the app.
  //   art: 'o' | 'a' | 'os' | 'as' | '' (no article - most city names)
  //   g / pl: gender and number, for agreement
  sentences: {
    // WHO. p = person (0 eu, 2 ele/ela, 3 nós, 4 eles). eu and nós are dropped
    // in the Portuguese, as people normally do.
    people: [
      { kind: 'me', p: 0, en: 'I', g: 'm' },
      { kind: 'we', p: 3, en: 'we', g: 'm', pl: true },
      { kind: 'name', pt: 'o João', p: 2, en: 'João', g: 'm' },
      { kind: 'name', pt: 'a Ana', p: 2, en: 'Ana', g: 'f' },
      { kind: 'name', pt: 'o Rui', p: 2, en: 'Rui', g: 'm' },
      { kind: 'name', pt: 'a Marta', p: 2, en: 'Marta', g: 'f' },
      { kind: 'name', pt: 'a Inês', p: 2, en: 'Inês', g: 'f' },
      { kind: 'name', pt: 'o Pedro', p: 2, en: 'Pedro', g: 'm' },
      { kind: 'family', pt: 'o meu irmão', p: 2, en: 'my brother', g: 'm' },
      { kind: 'family', pt: 'a minha irmã', p: 2, en: 'my sister', g: 'f' },
      { kind: 'family', pt: 'o meu pai', p: 2, en: 'my father', g: 'm' },
      { kind: 'family', pt: 'a minha mãe', p: 2, en: 'my mother', g: 'f' },
      { kind: 'family', pt: 'o meu primo', p: 2, en: 'my cousin', g: 'm' },
      { kind: 'family', pt: 'a minha avó', p: 2, en: 'my grandmother', g: 'f', elderly: true },
      { kind: 'family', pt: 'os meus pais', p: 4, en: 'my parents', g: 'm', pl: true },
      { kind: 'friend', pt: 'o meu amigo', p: 2, en: 'my friend', g: 'm' },
      { kind: 'friend', pt: 'a minha amiga', p: 2, en: 'my friend', g: 'f' },
      { kind: 'friend', pt: 'os meus amigos', p: 4, en: 'my friends', g: 'm', pl: true },
      { kind: 'colleague', pt: 'o meu colega', p: 2, en: 'my colleague', g: 'm' },
      { kind: 'colleague', pt: 'a minha colega', p: 2, en: 'my colleague', g: 'f' },
    ],
    // WHO WITH - "com" + these (com o → com o; no contraction with com).
    companions: [
      { pt: 'com o meu irmão', en: 'with my brother', who: 'o meu irmão' },
      { pt: 'com a minha irmã', en: 'with my sister', who: 'a minha irmã' },
      { pt: 'com a Ana', en: 'with Ana', who: 'a Ana' },
      { pt: 'com o João', en: 'with João', who: 'o João' },
      { pt: 'com uns amigos', en: 'with some friends' },
      { pt: 'com uma colega', en: 'with a colleague', work: true },
      { pt: 'com os meus pais', en: 'with my parents', who: 'os meus pais' },
      { pt: 'com a família', en: 'with the family' },
    ],
    // WHEN, by tense: hab (habitually - present), fut (plans - present or ir +
    // infinitive), past. Flags: night, morning, weekend, weekday, long (a
    // whole week/year - only for trips).
    times: {
      hab: [
        { pt: 'Todos os dias', en: 'every day' },
        { pt: 'Às vezes', en: 'sometimes' },
        { pt: 'De manhã', en: 'in the morning', morning: true },
        { pt: 'À tarde', en: 'in the afternoon' },
        { pt: 'À noite', en: 'in the evening', night: true },
        { pt: 'Ao fim de semana', en: 'at weekends', weekend: true },
        { pt: 'Aos sábados', en: 'on Saturdays', weekend: true },
        { pt: 'Aos domingos', en: 'on Sundays', weekend: true },
        { pt: 'Às segundas-feiras', en: 'on Mondays', weekday: true },
        { pt: 'Às sextas-feiras', en: 'on Fridays', weekday: true },
        { pt: 'Muitas vezes', en: 'often' },
        { pt: 'De vez em quando', en: 'now and then' },
      ],
      fut: [
        { pt: 'Amanhã', en: 'tomorrow' },
        { pt: 'Amanhã de manhã', en: 'tomorrow morning', morning: true },
        { pt: 'Logo à noite', en: 'tonight', night: true },
        { pt: 'Esta tarde', en: 'this afternoon' },
        { pt: 'No sábado', en: 'on Saturday', weekend: true },
        { pt: 'No domingo', en: 'on Sunday', weekend: true },
        { pt: 'Na sexta-feira', en: 'on Friday', weekday: true },
        { pt: 'Este fim de semana', en: 'this weekend', weekend: true },
        { pt: 'Na próxima semana', en: 'next week', long: true },
        { pt: 'Para o ano', en: 'next year', long: true },
      ],
      past: [
        { pt: 'Ontem', en: 'yesterday' },
        { pt: 'Ontem à noite', en: 'last night', night: true },
        { pt: 'Anteontem', en: 'the day before yesterday' },
        { pt: 'Esta manhã', en: 'this morning', morning: true },
        { pt: 'No sábado passado', en: 'last Saturday', weekend: true },
        { pt: 'No domingo passado', en: 'last Sunday', weekend: true },
        { pt: 'Na sexta-feira passada', en: 'last Friday', weekday: true },
        { pt: 'Há dois dias', en: 'two days ago' },
        { pt: 'Na semana passada', en: 'last week', long: true },
        { pt: 'No verão passado', en: 'last summer', long: true },
      ],
    },
    // WHERE TO (ir a…). kind: town (local, any day), culture (daytime),
    // shop (daytime), night (evenings), work (weekdays), city (a trip -
    // weekends / long times), far (a flight).
    destinations: [
      { pt: 'praia', art: 'a', en: 'the beach', kind: 'town', day: true },
      { pt: 'museu', art: 'o', en: 'the museum', kind: 'culture' },
      { pt: 'mercado', art: 'o', en: 'the market', kind: 'shop' },
      { pt: 'supermercado', art: 'o', en: 'the supermarket', kind: 'shop' },
      { pt: 'cinema', art: 'o', en: 'the cinema', kind: 'night' },
      { pt: 'teatro', art: 'o', en: 'the theatre', kind: 'night' },
      { pt: 'ginásio', art: 'o', en: 'the gym', kind: 'town' },
      { pt: 'trabalho', art: 'o', en: 'work', kind: 'work' },
      { pt: 'banco', art: 'o', en: 'the bank', kind: 'shop', weekday: true },
      { pt: 'farmácia', art: 'a', en: 'the chemist', kind: 'shop' },
      { pt: 'correios', art: 'os', en: 'the post office', kind: 'shop', weekday: true },
      { pt: 'biblioteca', art: 'a', en: 'the library', kind: 'culture' },
      { pt: 'castelo', art: 'o', en: 'the castle', kind: 'culture' },
      { pt: 'jardim', art: 'o', en: 'the park', kind: 'town', day: true },
      { pt: 'centro comercial', art: 'o', en: 'the shopping centre', kind: 'shop' },
      { pt: 'restaurante', art: 'o', en: 'the restaurant', kind: 'night' },
      { pt: 'Baixa', art: 'a', en: 'the town centre', kind: 'town' },
      { pt: 'Porto', art: 'o', en: 'Porto', kind: 'city' },
      { pt: 'Lisboa', art: '', en: 'Lisbon', kind: 'city' },
      { pt: 'Sintra', art: '', en: 'Sintra', kind: 'city' },
      { pt: 'Coimbra', art: '', en: 'Coimbra', kind: 'city' },
      { pt: 'Braga', art: '', en: 'Braga', kind: 'city' },
      { pt: 'Algarve', art: 'o', en: 'the Algarve', kind: 'city' },
      { pt: 'Açores', art: 'os', en: 'the Azores', kind: 'far' },
      { pt: 'Madeira', art: 'a', en: 'Madeira', kind: 'far' },
    ],
    // HOW - de + transport (no article), or a pé. local: fine in town;
    // trip: fine for cities; flight: only for 'far'.
    transport: [
      { pt: 'de comboio', en: 'by train', trip: true },
      { pt: 'de autocarro', en: 'by bus', local: true, trip: true },
      { pt: 'de metro', en: 'on the metro', local: true },
      { pt: 'de carro', en: 'by car', local: true, trip: true },
      { pt: 'de táxi', en: 'by taxi', local: true },
      { pt: 'a pé', en: 'on foot', local: true },
      { pt: 'de bicicleta', en: 'by bike', local: true },
      { pt: 'de avião', en: 'by plane', flight: true },
    ],
    // WHERE AT (em + …) for activities.
    places: {
      home: { pt: 'casa', art: '', en: 'at home', bare: 'em casa' },
      cafe: { pt: 'café', art: 'o', en: 'at the café' },
      terrace: { pt: 'esplanada', art: 'a', en: 'on the terrace' },
      restaurant: { pt: 'restaurante', art: 'o', en: 'at the restaurant' },
      beach: { pt: 'praia', art: 'a', en: 'on the beach' },
      park: { pt: 'jardim', art: 'o', en: 'in the park' },
      train: { pt: 'comboio', art: 'o', en: 'on the train' },
      office: { pt: 'escritório', art: 'o', en: 'at the office' },
      library: { pt: 'biblioteca', art: 'a', en: 'at the library' },
      market: { pt: 'mercado', art: 'o', en: 'at the market' },
      kitchen: { pt: 'cozinha', art: 'a', en: 'in the kitchen' },
    },
    // WHAT - verbs with sensible objects. en: [base, he/she, past, -ing].
    // places: where it makes sense to do it (keys of places above). An object
    // can carry its own English forms and places: [pt, en, forms, places].
    // rare: not something you'd do every day (no 'todos os dias').
    activities: [
      { verb: 'comer', en: ['eat', 'eats', 'ate', 'eating'], places: ['home', 'restaurant', 'terrace', 'cafe', 'beach'],
        objs: [['bacalhau', 'salt cod'], ['sardinhas', 'sardines'], ['um pastel de nata', 'a custard tart'], ['uma francesinha', 'a francesinha'],
          ['uma sopa', 'a soup'], ['uma salada', 'a salad'], ['peixe grelhado', 'grilled fish'], ['arroz de marisco', 'seafood rice'], ['uma tosta mista', 'a toastie'], ['fruta', 'fruit']] },
      { verb: 'beber', en: ['drink', 'drinks', 'drank', 'drinking'], places: ['home', 'cafe', 'terrace', 'restaurant'],
        objs: [['um café', 'a coffee'], ['uma bica', 'an espresso'], ['um galão', 'a milky coffee'], ['um chá', 'a tea'], ['uma cerveja', 'a beer'],
          ['um copo de vinho', 'a glass of wine'], ['vinho verde', 'vinho verde'], ['um sumo de laranja', 'an orange juice'], ['água', 'water']] },
      { verb: 'comprar', rare: true, en: ['buy', 'buys', 'bought', 'buying'], places: ['market'],
        objs: [['pão', 'bread'], ['fruta', 'fruit'], ['um bilhete', 'a ticket'], ['uma lembrança', 'a souvenir'], ['um livro', 'a book'],
          ['uns sapatos', 'some shoes'], ['um casaco', 'a coat'], ['um guarda-chuva', 'an umbrella'], ['uns postais', 'some postcards'], ['flores', 'flowers']] },
      { verb: 'ler', en: ['read', 'reads', 'read', 'reading'], places: ['home', 'cafe', 'train', 'park', 'beach', 'library'],
        objs: [['o jornal', 'the paper'], ['um livro', 'a book'], ['uma revista', 'a magazine'], ['as notícias', 'the news']] },
      { verb: 'ver', en: ['watch', 'watches', 'watched', 'watching'], places: ['home'],
        objs: [['um filme', 'a film'], ['televisão', 'TV'], ['o jogo', 'the match'], ['uma série', 'a series'], ['as notícias', 'the news']] },
      { verb: 'escrever', en: ['write', 'writes', 'wrote', 'writing'], places: ['home', 'cafe', 'train', 'office'],
        objs: [['uma mensagem', 'a message'], ['um postal', 'a postcard'], ['um email', 'an email'], ['uma carta', 'a letter']] },
      { verb: 'estudar', en: ['study', 'studies', 'studied', 'studying'], places: ['home', 'library', 'cafe'],
        objs: [['português', 'Portuguese'], ['japonês', 'Japanese'], ['inglês', 'English'], ['história', 'history'], ['para o exame', 'for the exam']] },
      { verb: 'ouvir', en: ['listen to', 'listens to', 'listened to', 'listening to'], places: ['home', 'train', 'cafe'],
        objs: [['música', 'music'], ['a rádio', 'the radio'], ['um podcast', 'a podcast'], ['fado', 'fado']] },
      { verb: 'fazer', places: [],
        objs: [['o jantar', 'dinner', ['make', 'makes', 'made', 'making'], ['home', 'kitchen']], ['compras', 'the shopping', ['do', 'does', 'did', 'doing'], ['market']],
          ['exercício', 'some exercise', ['do', 'does', 'did', 'doing'], ['park', 'home']], ['uma caminhada', 'a walk', ['go for', 'goes for', 'went for', 'going for'], ['park', 'beach']],
          ['um bolo', 'a cake', ['make', 'makes', 'made', 'making'], ['home', 'kitchen']], ['os trabalhos de casa', 'the homework', ['do', 'does', 'did', 'doing'], ['home', 'library']]] },
      { verb: 'tomar', en: ['have', 'has', 'had', 'having'], places: ['home', 'cafe', 'terrace'],
        objs: [['o pequeno-almoço', 'breakfast'], ['um café', 'a coffee'], ['um duche', 'a shower', null, ['home']], ['um chá', 'a tea']] },
      { verb: 'visitar', rare: true, en: ['visit', 'visits', 'visited', 'visiting'], places: [],
        objs: [['os avós', 'the grandparents'], ['um museu', 'a museum'], ['o castelo', 'the castle'], ['uma amiga', 'a friend'], ['a família', 'the family']] },
      { verb: 'cozinhar', en: ['cook', 'cooks', 'cooked', 'cooking'], places: ['home', 'kitchen'],
        objs: [['bacalhau', 'salt cod'], ['o jantar', 'dinner'], ['uma sopa', 'a soup'], ['arroz', 'rice']] },
    ],
    // ROUTINE CLOCKS - reflexive verbs (levantar-se, deitar-se), where the
    // pronoun goes after the verb in Portugal: levanto-me, levantamo-nos.
    reflexives: [
      { inf: 'levantar', en: ['get up', 'gets up', 'got up'], hours: [6, 7, 7, 8, 9] },
      { inf: 'deitar', en: ['go to bed', 'goes to bed', 'went to bed'], hours: [22, 22, 23, 23, 0] },
    ],
    // GIVING (2026-11-05) - verb + what + to whom (a + o = ao, a + a = à…).
    // en: [base, he/she, past, -ing]. The person given to comes from people.
    giving: [
      { verb: 'dar', en: ['give', 'gives', 'gave', 'giving'], objs: [['um presente', 'a present'], ['flores', 'flowers'], ['um livro', 'a book'], ['dinheiro', 'some money'], ['um beijinho', 'a kiss']] },
      { verb: 'oferecer', en: ['give', 'gives', 'gave', 'giving'], objs: [['um vinho do Porto', 'a bottle of port'], ['chocolates', 'chocolates'], ['uma camisola', 'a jumper'], ['um livro', 'a book']] },
      { verb: 'mandar', en: ['send', 'sends', 'sent', 'sending'], objs: [['uma mensagem', 'a message'], ['um email', 'an email'], ['um postal', 'a postcard'], ['uma foto', 'a photo']] },
      { verb: 'emprestar', en: ['lend', 'lends', 'lent', 'lending'], objs: [['o carro', 'the car'], ['um guarda-chuva', 'an umbrella'], ['dinheiro', 'some money'], ['um livro', 'a book']] },
      { verb: 'mostrar', en: ['show', 'shows', 'showed', 'showing'], objs: [['as fotos', 'the photos'], ['a cidade', 'the city'], ['a casa', 'the house'], ['o bilhete', 'the ticket', 'service']] },
      { verb: 'escrever', en: ['write', 'writes', 'wrote', 'writing'], objs: [['uma carta', 'a letter'], ['um postal', 'a postcard'], ['um email', 'an email']] },
      // pedir X a alguém = ask someone for X (the English turns round).
      { verb: 'pedir', en: ['ask', 'asks', 'asked', 'asking'], askFor: true, objs: [['a conta', 'the bill', 'service'], ['ajuda', 'help', 'any'], ['informações', 'some information', 'service'], ['um conselho', 'some advice']] },
    ],
    // People you give things to besides family and friends (objects marked
    // 'service' go only to these; 'any' to either).
    serviceRecipients: [['o empregado', 'the waiter'], ['a rececionista', 'the receptionist'], ['o revisor', 'the ticket inspector'], ['o motorista', 'the driver']],
    // BEING (2026-10-24) - how people are, for the Being mode of the sentence
    // builder: [masculine singular, English, 'ser' | 'estar']. estar = how
    // someone is right now; ser = what they're like. The app makes them agree.
    beingPeople: [
      ['cansado', 'tired', 'estar'], ['contente', 'pleased', 'estar'], ['doente', 'ill', 'estar'], ['ocupado', 'busy', 'estar'],
      ['triste', 'sad', 'estar'], ['atrasado', 'late', 'estar'], ['pronto', 'ready', 'estar'], ['com fome', 'hungry', 'estar'],
      ['alto', 'tall', 'ser'], ['baixo', 'short', 'ser'], ['simpático', 'friendly', 'ser'], ['divertido', 'fun', 'ser'],
      ['português', 'Portuguese', 'ser'], ['inglês', 'English', 'ser'], ['escocês', 'Scottish', 'ser'],
    ],
    // JOBS - masculine / feminine, and where the job is (em + workplace).
    jobs: [
      { m: 'enfermeiro', f: 'enfermeira', en: 'a nurse', at: { pt: 'hospital', art: 'um' }, atEn: 'in a hospital' },
      { m: 'médico', f: 'médica', en: 'a doctor', at: { pt: 'centro de saúde', art: 'um' }, atEn: 'at a health centre' },
      { m: 'professor', f: 'professora', en: 'a teacher', at: { pt: 'escola', art: 'uma' }, atEn: 'in a school' },
      { m: 'engenheiro', f: 'engenheira', en: 'an engineer', at: { pt: 'empresa de software', art: 'uma' }, atEn: 'for a software company' },
      { m: 'advogado', f: 'advogada', en: 'a lawyer', at: { pt: 'escritório no centro', art: 'um' }, atEn: 'in an office in the centre' },
      { m: 'cozinheiro', f: 'cozinheira', en: 'a cook', at: { pt: 'restaurante', art: 'um' }, atEn: 'in a restaurant' },
      { m: 'empregado de mesa', f: 'empregada de mesa', en: 'a waiter', enF: 'a waitress', at: { pt: 'café na Baixa', art: 'um' }, atEn: 'in a café downtown' },
      { m: 'farmacêutico', f: 'farmacêutica', en: 'a pharmacist', at: { pt: 'farmácia', art: 'uma' }, atEn: 'in a chemist' },
      { m: 'gestor', f: 'gestora', en: 'a manager', at: { pt: 'banco', art: 'um' }, atEn: 'at a bank' },
    ],
    // DESCRIPTIONS - things in context, with adjectives that suit them.
    // Adjectives are given masculine singular; the app makes them agree.
    // be: 'ser' (what it's like) or 'estar' (how it is right now). good:
    // true/false decides "e" (and) or "mas" (but) between two halves.
    describe: [
      { ctx: 'hotel', items: [
        { pt: 'hotel', art: 'o', en: 'the hotel', adj: [['caro', 'expensive', 'ser', false], ['barato', 'cheap', 'ser', true], ['novo', 'new', 'ser', true], ['velho', 'old', 'ser', false]] },
        { pt: 'quarto', art: 'o', en: 'the room', adj: [['pequeno', 'small', 'ser', false], ['grande', 'big', 'ser', true], ['limpo', 'clean', 'estar', true], ['confortável', 'comfortable', 'ser', true]] },
      ] },
      { ctx: 'restaurant', items: [
        { pt: 'restaurante', art: 'o', en: 'the restaurant', adj: [['caro', 'expensive', 'ser', false], ['barato', 'cheap', 'ser', true], ['cheio', 'full', 'estar', false], ['pequeno', 'small', 'ser', false]] },
        { pt: 'comida', art: 'a', en: 'the food', adj: [['delicioso', 'delicious', 'ser', true], ['bom', 'good', 'ser', true], ['frio', 'cold', 'estar', false]] },
        { pt: 'empregados', art: 'os', en: 'the waiters', adj: [['simpático', 'friendly', 'ser', true]] },
      ] },
      { ctx: 'town', items: [
        { pt: 'cidade', art: 'a', en: 'the city', adj: [['bonito', 'beautiful', 'ser', true], ['grande', 'big', 'ser', true], ['antigo', 'old', 'ser', true]] },
        { pt: 'ruas', art: 'as', en: 'the streets', adj: [['estreito', 'narrow', 'ser', false], ['bonito', 'pretty', 'ser', true], ['cheio', 'full', 'estar', false]] },
        { pt: 'museu', art: 'o', en: 'the museum', adj: [['interessante', 'interesting', 'ser', true], ['fechado', 'closed', 'estar', false], ['grande', 'big', 'ser', true]] },
      ] },
      { ctx: 'travel', items: [
        { pt: 'comboio', art: 'o', en: 'the train', adj: [['rápido', 'fast', 'ser', true], ['atrasado', 'late', 'estar', false], ['cheio', 'full', 'estar', false]] },
        { pt: 'autocarro', art: 'o', en: 'the bus', adj: [['lento', 'slow', 'ser', false], ['vazio', 'empty', 'estar', true], ['atrasado', 'late', 'estar', false]] },
        { pt: 'bilhetes', art: 'os', en: 'the tickets', adj: [['barato', 'cheap', 'ser', true], ['caro', 'expensive', 'ser', false]] },
      ] },
      { ctx: 'cafe', items: [
        { pt: 'café', art: 'o', en: 'the coffee', adj: [['forte', 'strong', 'ser', true], ['frio', 'cold', 'estar', false], ['ótimo', 'great', 'ser', true]] },
        { pt: 'pastéis de nata', art: 'os', en: 'the custard tarts', adj: [['delicioso', 'delicious', 'ser', true], ['quente', 'warm', 'estar', true]] },
        { pt: 'esplanada', art: 'a', en: 'the terrace', adj: [['cheio', 'full', 'estar', false], ['agradável', 'pleasant', 'ser', true]] },
      ] },
    ],
    // WEATHER -> what people do about it.
    weather: [
      { pt: 'Está sol', en: "It's sunny", good: true },
      { pt: 'Está calor', en: "It's hot", good: true },
      { pt: 'Está frio', en: "It's cold", good: false },
      { pt: 'Está a chover', en: "It's raining", good: false },
      { pt: 'Está muito vento', en: "It's very windy", good: false },
    ],
    weatherGood: [['vamos à praia', "we're going to the beach"], ['vamos jantar na esplanada', "we're having dinner on the terrace"], ['vou dar um passeio', "I'm going for a walk"], ['vamos ao jardim', "we're going to the park"]],
    weatherBad: [['fico em casa', "I'm staying at home"], ['vamos ao cinema', "we're going to the cinema"], ['vou ao museu', "I'm going to the museum"], ['vamos apanhar um táxi', "we're getting a taxi"]],
    // LIKES - nouns (no article: generic) and infinitives.
    likes: [
      ['bacalhau', 'salt cod'], ['sardinhas', 'sardines'], ['pastéis de nata', 'custard tarts'], ['vinho verde', 'vinho verde'],
      ['café', 'coffee'], ['chá', 'tea'], ['marisco', 'seafood'], ['futebol', 'football'], ['fado', 'fado'], ['ir à praia', 'going to the beach'],
      ['cozinhar', 'cooking'], ['viajar', 'travelling'], ['ler', 'reading'], ['acordar cedo', 'getting up early'],
      ['andar de comboio', 'travelling by train'], ['dançar', 'dancing'], ['ir ao cinema', 'going to the cinema'], ['nadar', 'swimming'],
    ],
    // PREFER X TO Y - only between things of the same sort.
    prefer: [
      [['bacalhau', 'salt cod'], ['sardinhas', 'sardines'], ['marisco', 'seafood'], ['carne', 'meat'], ['peixe', 'fish']],
      [['café', 'coffee'], ['chá', 'tea'], ['sumo', 'juice']],
      [['vinho tinto', 'red wine'], ['vinho branco', 'white wine'], ['cerveja', 'beer'], ['vinho verde', 'vinho verde']],
      [['o mar', 'the sea'], ['a montanha', 'the mountains'], ['o campo', 'the countryside'], ['a cidade', 'the city']],
      [['o verão', 'summer'], ['o inverno', 'winter'], ['a primavera', 'spring'], ['o outono', 'autumn']],
      [['ler', 'reading'], ['ver televisão', 'watching TV'], ['sair à noite', 'going out at night'], ['ficar em casa', 'staying in']],
    ],
    hometowns: [
      { pt: 'Porto', art: 'o', en: 'Porto' }, { pt: 'Lisboa', art: '', en: 'Lisbon' }, { pt: 'Coimbra', art: '', en: 'Coimbra' },
      { pt: 'Escócia', art: 'a', en: 'Scotland' }, { pt: 'Inglaterra', art: 'a', en: 'England' }, { pt: 'Brasil', art: 'o', en: 'Brazil' },
      { pt: 'Manchester', art: '', en: 'Manchester' }, { pt: 'Algarve', art: 'o', en: 'the Algarve' },
    ],
    // ORDERING, ASKING THE WAY, OPENING TIMES (from the first version).
    orders: [
      { pt: 'uma bica', en: 'an espresso' },
      { pt: 'um galão', en: 'a milky coffee' },
      { pt: 'uma meia de leite', en: 'a white coffee' },
      { pt: 'um pastel de nata', en: 'a custard tart' },
      { pt: 'uma tosta mista', en: 'a toasted ham and cheese sandwich' },
      { pt: 'um sumo de laranja', en: 'an orange juice' },
      { pt: 'uma água sem gás', en: 'a still water' },
      { pt: 'um copo de vinho tinto', en: 'a glass of red wine' },
      { pt: 'uma imperial', en: 'a small beer' },
      { pt: 'um prego', en: 'a steak sandwich' },
    ],
    orderFrames: [
      { pt: 'Queria {a} e {b}, se faz favor.', en: "I'd like {a} and {b}, please." },
      { pt: 'Para mim, {a}, se faz favor.', en: 'For me, {a}, please.' },
      { pt: 'Pode trazer-me {a}, se faz favor?', en: 'Could you bring me {a}, please?' },
    ],
    whereIs: [
      { pt: 'estação', art: 'a', en: 'the station' },
      { pt: 'museu', art: 'o', en: 'the museum' },
      { pt: 'farmácia', art: 'a', en: 'the chemist' },
      { pt: 'multibanco', art: 'o', en: 'the cash machine', near: true },
      { pt: 'casa de banho', art: 'a', en: 'the toilet', near: true },
      { pt: 'paragem do autocarro', art: 'a', en: 'the bus stop' },
      { pt: 'mercado', art: 'o', en: 'the market' },
    ],
    directions: [
      { pt: 'Fica ao fundo da rua, à esquerda.', en: "It's at the end of the street, on the left." },
      { pt: 'Fica aqui perto, à direita.', en: "It's nearby, on the right." },
      { pt: 'Fica do outro lado da praça.', en: "It's on the other side of the square." },
      { pt: 'Siga sempre em frente, depois do semáforo.', en: 'Carry straight on, past the traffic lights.' },
      { pt: 'Fica em frente da igreja.', en: "It's opposite the church." },
      { pt: 'Fica ao lado do hotel.', en: "It's next to the hotel." },
      { pt: 'Fica a dez minutos a pé.', en: "It's ten minutes' walk.", far: true },
    ],
    opening: [
      { pt: 'museu', art: 'o', en: 'the museum' },
      { pt: 'mercado', art: 'o', en: 'the market' },
      { pt: 'farmácia', art: 'a', en: 'the chemist' },
      { pt: 'castelo', art: 'o', en: 'the castle' },
      { pt: 'loja', art: 'a', en: 'the shop' },
    ],
  },

  // GRAMMAR NOTES - one card each on the Grammar screen. html is shown as-is
  // (simple markup: p, b, i, table.gtable, ul). drill (optional) adds a button:
  // { type: 'verbs', tenses: [...] } or { type: 'contractions' }.
  // SOUNDS ALIKE (2026-10-14) - pairs of real words that differ by one sound
  // an English ear tends to miss. The drill plays one and you pick which.
  // a / b: [Portuguese, English]. note: shown after answering.
  soundPairs: [
    { a: ['avó', 'grandmother'], b: ['avô', 'grandfather'], note: 'ó is open (like "aw"), ô is closed (like "oh").' },
    { a: ['só', 'only'], b: ['sou', 'I am'], note: 'só is open (like "saw"); sou is a closed "so".' },
    { a: ['pode', 'he/she can'], b: ['pôde', 'he/she could'], note: 'pode has an open o; pôde (past) has a closed ô.' },
    { a: ['sé', 'cathedral'], b: ['se', 'if'], note: 'sé is a full open "eh"; se is almost swallowed.' },
    { a: ['mas', 'but'], b: ['mais', 'more'], note: 'mas is a short "mush"; mais has the "eye" glide ("mysh").' },
    { a: ['pais', 'parents'], b: ['país', 'country'], note: 'pais is one syllable ("pysh"); país is two, stressed on the í ("pa-EESH").' },
    { a: ['pau', 'stick'], b: ['pão', 'bread'], note: 'ão is nasal - through the nose; au is not.' },
    { a: ['mau', 'bad'], b: ['mão', 'hand'], note: 'ão is nasal - through the nose; au is not.' },
    { a: ['com', 'with'], b: ['cão', 'dog'], note: 'com is a nasal "o"; cão is the nasal "ow" (ão).' },
    { a: ['vi', 'I saw'], b: ['vim', 'I came'], note: 'vim ends in a nasal "ee", with no real m sound.' },
    { a: ['caro', 'expensive'], b: ['carro', 'car'], note: 'One r is a quick tap; rr is rolled or throaty, like a French r.' },
    { a: ['muro', 'wall'], b: ['murro', 'punch'], note: 'One r is a quick tap; rr is rolled or throaty.' },
    { a: ['vela', 'candle'], b: ['velha', 'old (woman)'], note: 'lh is like the "lli" in "million".' },
    { a: ['sono', 'sleep'], b: ['sonho', 'dream'], note: 'nh is like the "ny" in "canyon".' },
    { a: ['uma', 'one / a'], b: ['unha', 'nail'], note: 'nh is like the "ny" in "canyon".' },
    { a: ['casa', 'house'], b: ['caça', 'hunt'], note: 's between vowels is a "z"; ç is always an "s".' },
    { a: ['doze', 'twelve'], b: ['doce', 'sweet'], note: 'z is a "z"; c before e is an "s".' },
    { a: ['falamos', 'we speak'], b: ['falámos', 'we spoke'], note: 'In Portugal the past has an open á ("fa-LAH-mush"); the present is closed ("fa-LUH-mush").' },
  ],

  // DESK SHEETS (2026-10-15) - printable pages of words to build sentences
  // from (Grammar page -> Desk sheets). Pages 1 and 2 take
  // their words from `sentences` above; these lists fill the rest.
  deskSheets: {
    often: [['sempre', 'always'], ['muitas vezes', 'often'], ['às vezes', 'sometimes'], ['de vez em quando', 'now and then'], ['raramente', 'rarely'], ['nunca', 'never']],
    frames: [['Queria…', "I'd like…"], ['Pode trazer-me…?', 'Could you bring me…?'], ['Para mim…', 'For me…'], ['Tem…?', 'Do you have…?'],
      ['Mais um / uma…', 'One more…'], ['Pode dar-me…?', 'Could you give me…?'], ['Posso ver…?', 'Can I see…?']],
    order: {
      'At the café': [['uma bica', 'an espresso'], ['um galão', 'a milky coffee'], ['uma meia de leite', 'a white coffee'], ['um chá', 'a tea'],
        ['um sumo de laranja', 'an orange juice'], ['uma água sem gás', 'a still water'], ['um pastel de nata', 'a custard tart'],
        ['uma tosta mista', 'a ham & cheese toastie'], ['um croissant', 'a croissant'], ['uma torrada', 'a slice of toast']],
      'At the restaurant': [['a ementa', 'the menu'], ['o prato do dia', 'the dish of the day'], ['uma sopa', 'a soup'], ['peixe grelhado', 'grilled fish'],
        ['bacalhau', 'salt cod'], ['uma salada', 'a salad'], ['um copo de vinho tinto', 'a glass of red wine'], ['uma imperial', 'a small beer'],
        ['uma garrafa de água', 'a bottle of water'], ['a conta', 'the bill'], ['uma mesa para dois', 'a table for two']],
    },
    where: [['a estação', 'the station'], ['o museu', 'the museum'], ['a farmácia', 'the chemist'], ['o multibanco', 'the cash machine'],
      ['a casa de banho', 'the toilet'], ['a paragem do autocarro', 'the bus stop'], ['o mercado', 'the market'], ['o hotel', 'the hotel'],
      ['a praia', 'the beach'], ['o metro', 'the metro'], ['o supermercado', 'the supermarket'], ['a bilheteira', 'the ticket office'],
      ['a igreja', 'the church'], ['a praça', 'the square']],
    cost: [['isto', 'this'], ['este / esta', 'this one'], ['o bilhete', 'the ticket'], ['um bilhete para o Porto', 'a ticket to Porto'],
      ['ida e volta', 'a return'], ['os postais', 'the postcards'], ['este casaco', 'this coat'], ['o quarto', 'the room'],
      ['por noite', 'per night'], ['por pessoa', 'per person'], ['a entrada', 'entry']],
    polite: [['se faz favor', 'please'], ['obrigado / obrigada', 'thank you'], ['com licença', 'excuse me (passing)'], ['desculpe', 'sorry / excuse me'],
      ['só isso', "that's all"], ['está ótimo', "it's great"], ['pode repetir?', 'could you repeat?'], ['mais devagar', 'more slowly'],
      ['não percebo', "I don't understand"], ['até logo', 'see you later']],
    hear: [['Mais alguma coisa?', 'Anything else?'], ['É para levar?', 'To take away?'], ['Para comer aqui?', 'To eat here?'],
      ['Quer fatura com contribuinte?', 'Receipt with your tax number?'], ['Cartão ou dinheiro?', 'Card or cash?'], ['Já escolheu?', 'Have you chosen?'],
      ['Quantas pessoas?', 'How many people?'], ['Está tudo bem?', 'Is everything OK?'], ['Sente-se onde quiser.', 'Sit wherever you like.'],
      ['Fica ali, à esquerda.', "It's over there, on the left."], ['É logo ali.', "It's just there."], ['Siga sempre em frente.', 'Keep going straight on.'],
      ['Não temos.', "We haven't got any."], ['Está esgotado.', "It's sold out."]],
  },

  notes: [
    {
      id: 'present', title: 'Present tense: the regular endings',
      drill: { type: 'verbs', tenses: ['pres'] },
      html: `
<p>Take off <b>-ar</b>, <b>-er</b> or <b>-ir</b> and add the ending for the person. Three patterns cover most verbs.</p>
<table class="gtable"><tr><th></th><th>falar</th><th>comer</th><th>abrir</th></tr>
<tr><td>eu</td><td>fal<b>o</b></td><td>com<b>o</b></td><td>abr<b>o</b></td></tr>
<tr><td>tu</td><td>fal<b>as</b></td><td>com<b>es</b></td><td>abr<b>es</b></td></tr>
<tr><td>ele / ela / você</td><td>fal<b>a</b></td><td>com<b>e</b></td><td>abr<b>e</b></td></tr>
<tr><td>nós</td><td>fal<b>amos</b></td><td>com<b>emos</b></td><td>abr<b>imos</b></td></tr>
<tr><td>eles / elas / vocês</td><td>fal<b>am</b></td><td>com<b>em</b></td><td>abr<b>em</b></td></tr></table>
<p><b>Rules worth knowing:</b></p>
<ul>
<li><b>eu</b> always ends in <b>-o</b> for regular verbs. The irregulars are mostly irregular <i>only</i> in the eu form: <i>faço, digo, tenho, venho, posso, sei, vejo, peço, ouço, durmo, conheço, trago, ponho</i>.</li>
<li><b>você</b>, <b>o senhor</b> and <b>a senhora</b> all take the ele/ela form: <i>você fala inglês?</i></li>
<li>-er and -ir only differ in the nós form: <i>comemos</i> / <i>abrimos</i>.</li>
<li>The present also covers the near future, as in English: <i>amanhã trabalho</i> - I'm working tomorrow.</li>
</ul>`,
    },
    {
      id: 'past', title: 'Past tense: what happened (pretérito perfeito)',
      drill: { type: 'verbs', tenses: ['pret'] },
      html: `
<p>For finished actions: <i>ontem comi bacalhau</i> - yesterday I ate salt cod.</p>
<table class="gtable"><tr><th></th><th>falar</th><th>comer</th><th>abrir</th></tr>
<tr><td>eu</td><td>fal<b>ei</b></td><td>com<b>i</b></td><td>abr<b>i</b></td></tr>
<tr><td>tu</td><td>fal<b>aste</b></td><td>com<b>este</b></td><td>abr<b>iste</b></td></tr>
<tr><td>ele / ela / você</td><td>fal<b>ou</b></td><td>com<b>eu</b></td><td>abr<b>iu</b></td></tr>
<tr><td>nós</td><td>fal<b>ámos</b></td><td>com<b>emos</b></td><td>abr<b>imos</b></td></tr>
<tr><td>eles / elas / vocês</td><td>fal<b>aram</b></td><td>com<b>eram</b></td><td>abr<b>iram</b></td></tr></table>
<ul>
<li><b>Portugal only:</b> the -ar nós past has an accent, <i>falámos</i> (we spoke), to tell it apart from the present <i>falamos</i> (we speak). Brazil writes both as falamos.</li>
<li><b>Spelling changes in the eu form</b>, to keep the sound: -car → <b>-quei</b> (<i>fiquei</i>), -gar → <b>-guei</b> (<i>paguei, cheguei</i>), -çar → <b>-cei</b> (<i>comecei, almocei</i>).</li>
<li><b>ser</b> and <b>ir</b> share one past: <i>fui</i> = I was / I went. Context tells you which.</li>
<li>The common irregulars: <i>tive, estive, fiz, disse, pude, quis, soube, vi, vim, dei, pus, trouxe</i>.</li>
</ul>`,
    },
    {
      id: 'imperfect', title: 'Was doing / used to (imperfeito)',
      drill: { type: 'verbs', tenses: ['imp'] },
      html: `
<p>For background, habits and descriptions in the past: <i>quando era pequeno, morava em Glasgow</i> - when I was little, I lived in Glasgow.</p>
<table class="gtable"><tr><th></th><th>falar</th><th>comer / abrir</th></tr>
<tr><td>eu</td><td>fal<b>ava</b></td><td>com<b>ia</b></td></tr>
<tr><td>tu</td><td>fal<b>avas</b></td><td>com<b>ias</b></td></tr>
<tr><td>ele / ela / você</td><td>fal<b>ava</b></td><td>com<b>ia</b></td></tr>
<tr><td>nós</td><td>fal<b>ávamos</b></td><td>com<b>íamos</b></td></tr>
<tr><td>eles / elas / vocês</td><td>fal<b>avam</b></td><td>com<b>iam</b></td></tr></table>
<ul>
<li>Only four irregulars: <i>era</i> (ser), <i>tinha</i> (ter), <i>vinha</i> (vir), <i>punha</i> (pôr).</li>
<li><b>Past or imperfect?</b> The past is the event; the imperfect is the scene around it: <i>estava a chover quando cheguei</i> - it was raining when I arrived.</li>
<li><b>Very common in Portugal:</b> the imperfect is used to make polite requests: <i>queria um café</i>, <i>gostava de uma mesa para dois</i> - I'd like…</li>
</ul>`,
    },
    {
      id: 'progressive', title: 'Right now: estar a + infinitive',
      drill: { type: 'verbs', tenses: ['prog'] },
      html: `
<p>For something happening at this moment, Portugal uses <b>estar a</b> + the infinitive:</p>
<p><i>estou a comer</i> - I'm eating &nbsp;·&nbsp; <i>está a chover</i> - it's raining &nbsp;·&nbsp; <i>estamos a aprender</i> - we're learning</p>
<ul>
<li>Only estar changes; the infinitive stays as it is.</li>
<li><b>Brazil</b> says it with the -ndo form instead: <i>estou comendo</i>. You'll understand both; in Portugal use estar a.</li>
<li>It works in the past too, with the imperfect of estar: <i>estava a dormir</i> - I was sleeping.</li>
<li>Verbs of state don't usually take it: <i>sei</i>, not <i>estou a saber</i>.</li>
</ul>`,
    },
    {
      id: 'future', title: 'Going to: ir + infinitive',
      drill: { type: 'verbs', tenses: ['fut'] },
      html: `
<p>The everyday future: the present of <b>ir</b> + the infinitive.</p>
<p><i>vou comer</i> - I'm going to eat &nbsp;·&nbsp; <i>vamos ao Porto</i> - we're going to Porto &nbsp;·&nbsp; <i>vai chover</i> - it's going to rain</p>
<table class="gtable"><tr><td>eu</td><td><b>vou</b> falar</td></tr><tr><td>tu</td><td><b>vais</b> falar</td></tr><tr><td>ele / ela / você</td><td><b>vai</b> falar</td></tr><tr><td>nós</td><td><b>vamos</b> falar</td></tr><tr><td>eles / elas / vocês</td><td><b>vão</b> falar</td></tr></table>
<ul>
<li>One verb to learn and you have a future for every verb.</li>
<li><i>vamos!</i> on its own is "let's go"; <i>vamos comer</i> can be "let's eat".</li>
</ul>`,
    },
    {
      id: 'ser-estar', title: 'ser or estar?',
      drill: { type: 'verbs', tenses: ['pres', 'pret', 'imp'], verbs: ['ser', 'estar'] },
      html: `
<p>Both mean "to be". The rule of thumb:</p>
<ul>
<li><b>ser</b> - what something <i>is</i>: identity, origin, job, nationality, time, what it's made of. <i>Sou do Reino Unido. É médica. São três horas. É de madeira.</i></li>
<li><b>estar</b> - how or where something is <i>at the moment</i>: states, feelings, weather, temporary location. <i>Estou cansado. Está calor. Estamos no hotel.</i></li>
</ul>
<p><b>Changes of meaning:</b> <i>é bonito</i> (it's a pretty thing) vs <i>está bonito</i> (it looks nice today); <i>ele é chato</i> (he's annoying) vs <i>ele está chateado</i> (he's annoyed).</p>
<p><b>Where things are permanently</b> usually takes <b>ficar</b>: <i>onde fica o museu?</i> - where is the museum?</p>`,
    },
    {
      id: 'contractions', title: 'Contractions: no, na, do, ao, pelo…',
      drill: { type: 'contractions' },
      html: `
<p>Four short prepositions merge with the word after them. These aren't optional - <i>em o hotel</i> is wrong; it has to be <i>no hotel</i>.</p>
<table class="gtable"><tr><th></th><th>o</th><th>a</th><th>os</th><th>as</th><th>um / uma</th></tr>
<tr><td><b>em</b> (in, at, on)</td><td>no</td><td>na</td><td>nos</td><td>nas</td><td>num / numa</td></tr>
<tr><td><b>de</b> (of, from)</td><td>do</td><td>da</td><td>dos</td><td>das</td><td>dum / duma*</td></tr>
<tr><td><b>a</b> (to, at)</td><td>ao</td><td>à</td><td>aos</td><td>às</td><td>-</td></tr>
<tr><td><b>por</b> (by, through, for)</td><td>pelo</td><td>pela</td><td>pelos</td><td>pelas</td><td>-</td></tr></table>
<ul>
<li>They also merge with <i>este, esse, aquele</i>: <i>neste, desse, naquele, àquele</i>, and with <i>ele/ela</i>: <i>dele</i> (his), <i>dela</i> (her).</li>
<li><b>à</b> with an accent is a + a: <i>vou à praia</i>. Plain <b>a</b> is just "the" or "to".</li>
<li><b>às</b> + hour = at: <i>às oito</i>. <b>pelas</b> + hour = around: <i>pelas oito</i>.</li>
<li>* dum / duma are common in speech; in writing <i>de um</i> is also fine.</li>
</ul>`,
    },
    {
      id: 'pronouns', title: 'Where me, te, se go',
      html: `
<p>The little object pronouns (<i>me, te, se, o, a, lhe, nos</i>) are the clearest Portugal / Brazil difference.</p>
<p><b>Portugal: after the verb, with a hyphen</b> - <i>chamo-me Andrew</i>, <i>ajude-me</i>, <i>diga-me</i>.</p>
<p><b>But before the verb</b> after these:</p>
<ul>
<li><b>não</b> and other negatives: <i>não me lembro</i> - I don't remember</li>
<li><b>question words</b>: <i>como se chama?</i>, <i>onde se compra?</i></li>
<li><b>que</b>, and words like <i>também, já, ainda, sempre, só, todos</i>: <i>também me chamo João</i>, <i>já te disse</i></li>
</ul>
<p><b>Brazil</b> mostly puts them before: <i>me chamo, me ajuda</i>. Both are understood, but chamo-me is what you'll hear in Portugal.</p>`,
    },
    {
      id: 'address', title: 'tu, você, o senhor',
      html: `
<ul>
<li><b>tu</b> - friends, family, children, people your age in casual settings. Verb in the tu form: <i>tu falas</i>.</li>
<li><b>o senhor / a senhora</b> - the polite way to address a stranger, an older person, a shopkeeper: <i>o senhor sabe onde fica…?</i> Verb in the ele/ela form.</li>
<li><b>você</b> - neutral in Brazil, but in Portugal it can feel a bit blunt to someone's face. Most people avoid the word and just use the verb: <i>sabe onde fica…?</i></li>
<li><b>vocês</b> - "you" to more than one person, in both countries. Verb in the eles/elas form.</li>
</ul>
<p>If unsure, drop the pronoun and use the ele/ela form of the verb - polite and natural: <i>fala inglês?</i></p>`,
    },
    {
      id: 'agreement', title: 'Gender, plurals and agreement',
      html: `
<ul>
<li>Every noun is masculine (<b>o</b>) or feminine (<b>a</b>). Most -o words are masculine, most -a words feminine - but learn the article with the word: <i>o dia, o mapa, a mão, a viagem</i>.</li>
<li>Words ending <b>-ção, -dade, -gem</b> are feminine: <i>a estação, a cidade, a viagem</i>.</li>
<li>Adjectives agree with the noun: <i>o vinho tinto, a casa pequena, os bolos bons</i>. Adjectives ending in -e don't change for gender: <i>grande, quente</i>.</li>
<li>Plurals usually add <b>-s</b>. Endings to know: -m → -ns (<i>homens</i>), -l → -is (<i>espanhóis</i>), -r / -z → -res / -zes (<i>mulheres, luzes</i>), and -ão → -ões / -ães / -ãos (<i>estações, pães, mãos</i>) - the -ão plurals have to be learnt.</li>
</ul>`,
    },
    {
      id: 'parts', title: 'Words built from parts: padaria, padeiro',
      html: `
<p>Many Portuguese words are a familiar word plus an ending. Know the endings and a shop sign or a job you've never seen often explains itself.</p>
<p><b>-aria</b> - the shop that sells it:</p>
<table class="gtable"><tr><th>word</th><th>shop</th></tr>
<tr><td>o pão (bread)</td><td>a pad<b>aria</b> - the bakery</td></tr>
<tr><td>o livro (book)</td><td>a livr<b>aria</b> - the bookshop</td></tr>
<tr><td>o sapato (shoe)</td><td>a sapat<b>aria</b> - the shoe shop</td></tr>
<tr><td>o pastel (pastry)</td><td>a pastel<b>aria</b> - the cake shop / café</td></tr>
<tr><td>o peixe (fish)</td><td>a peix<b>aria</b> - the fishmonger's</td></tr>
<tr><td>a fruta (fruit)</td><td>a frut<b>aria</b> - the greengrocer's</td></tr></table>
<p><b>-eiro / -eira</b> - the person who does it:</p>
<table class="gtable"><tr><th>word</th><th>person</th></tr>
<tr><td>o pão</td><td>o pad<b>eiro</b> / a pad<b>eira</b> - the baker</td></tr>
<tr><td>a carta (letter)</td><td>o cart<b>eiro</b> - the postman</td></tr>
<tr><td>a cozinha (kitchen)</td><td>o cozinh<b>eiro</b> / a cozinh<b>eira</b> - the cook</td></tr>
<tr><td>o jardim (garden)</td><td>o jardin<b>eiro</b> - the gardener</td></tr>
<tr><td>o cabelo (hair)</td><td>o cabeleireiro - the hairdresser</td></tr></table>
<p><b>-inho / -inha</b> - little, or just friendly. Very Portuguese: <i>um bocad<b>inho</b></i> (a little bit), <i>um beij<b>inho</b></i> (a kiss on the cheek), <i>devagar<b>inho</b></i> (nice and slowly), <i>obrigad<b>inho</b></i>. The opposite, <b>-ão</b>, makes it big: <i>um garraf<b>ão</b></i> (a big bottle).</p>
<p><b>-mente</b> = -ly, added to the feminine form: <i>rápida → rapida<b>mente</b></i>, <i>normal<b>mente</b></i>, <i>final<b>mente</b></i>.</p>
<p><b>-ção</b> = -tion, and always feminine: <i>a informa<b>ção</b></i>, <i>a dire<b>ção</b></i> (direction), <i>a esta<b>ção</b></i>. The plural is <b>-ções</b>: <i>as estações</i>.</p>
<p><b>des-</b> = un- / dis-: <i>ligar → <b>des</b>ligar</i> (switch on / off), <i>fazer → <b>des</b>fazer</i> (undo, unpack), <i>conhecido → <b>des</b>conhecido</i> (unknown).</p>
<p><b>Put together</b>: <i>o guarda-chuva</i> (keeps-rain: umbrella), <i>o guarda-roupa</i> (wardrobe), <i>o saca-rolhas</i> (pulls-corks: corkscrew), <i>o pequeno-almoço</i> (small lunch: breakfast).</p>`,
    },
  ],
};
