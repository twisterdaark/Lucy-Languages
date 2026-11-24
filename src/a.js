const ICONS = /*ICONS*/{};
// ---------- icons + helpers ----------
document.getElementById('sprite').innerHTML = Object.entries(ICONS).map(([n,d])=>`<symbol id="i-${n}" viewBox="0 0 512 512"><path d="${d}"/></symbol>`).join('');
const I = n => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const LUCY_ART = /*LUCYART*/'';
const LUCY = (cls = '') => `<svg class="lucy ${cls}" viewBox="0 0 200 200" aria-hidden="true" style="--bd:${(Math.random() * 3).toFixed(2)}s">${LUCY_ART}</svg>`;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const HEAT = [['SLANG', 'var(--mint)'], ['SPICY', 'var(--olive)'], ['HEAVY', 'var(--rose)'], ['SLUR · RECOGNISE ONLY', 'var(--violet)']];
const speakable = c => !c[4] && (c[3] ?? 0) < 3;   // chunk tuples: [pt, en, note, heat, notSpoken]

// ---------- course ----------
// Mission flow (research-based): Hear a real dialogue → Chunks → Shadow → Recall from memory → Write what you hear → Role-play with a goal.
const UNITS = [
  { id:'ola', level:'A1', pt:'E aí?', en:'Greetings', icon:'sun', scene:'party',
    dialogue:[['Lucas','E aí, tudo bem?','Hey, all good?'],['Você','Tudo bem! E você?','All good! And you?'],['Lucas','Tudo tranquilo. Bom te ver!','All chill. Good to see you!'],['Você','Bom te ver também. Até mais!','Good to see you too. See you!']],
    chunks:[['E aí?','what’s up? / hey','The everyday “hey”. “Oi” works too.'],['Tudo bem?','all good?','Answer with the same words: “Tudo bem!”'],['Tudo tranquilo','all chill',''],['Bom te ver!','good to see you!',''],['Até mais!','see you later!',''],['Valeu!','thanks! / cheers!','Casual thanks. “Obrigado” (men) / “obrigada” (women) is the polite one.'],['Boa noite','good evening / good night','“Bom dia” until lunch, “boa tarde” until dark.']],
    gloss:{'e':'and','aí':'there (here: “hey”)','tudo':'everything','bem':'well','você':'you','tranquilo':'calm, chill','bom':'good','te':'you','ver':'to see','também':'too','até':'until','mais':'more (até mais = see you)'},
    mission:'Greet Lucas, ask how he is, and say bye.' },
  { id:'eu', level:'A1', pt:'Eu sou…', en:'Introduce yourself', icon:'smartphone', scene:'party',
    dialogue:[['Júlia','Oi! Qual é o seu nome?','Hi! What’s your name?'],['Você','Meu nome é Twister. E o seu?','My name is Twister. And yours?'],['Júlia','Júlia. De onde você é?','Júlia. Where are you from?'],['Você','Eu sou do Egito, do Cairo.','I’m from Egypt, from Cairo.'],['Júlia','Que legal! Você fala português?','How cool! Do you speak Portuguese?'],['Você','Só um pouquinho!','Just a tiny bit!']],
    chunks:[['Qual é o seu nome?','what’s your name?',''],['Meu nome é…','my name is…',''],['E o seu?','and yours?',''],['De onde você é?','where are you from?',''],['Eu sou do Egito','I’m from Egypt','“Eu sou” = I am, for things that define you.'],['Que legal!','how cool!',''],['Só um pouquinho','just a tiny bit','“-inho” makes anything small and cute: pouco → pouquinho.']],
    gloss:{'qual':'which/what','é':'is','o':'the','seu':'your','nome':'name','meu':'my','de':'of/from','onde':'where','você':'you','eu':'I','sou':'am','do':'from the','egito':'Egypt','que':'how/what','legal':'cool','fala':'speak(s)','português':'Portuguese','só':'only','um':'a','pouquinho':'tiny bit'},
    mission:'Tell Júlia your name and where you’re from, and ask about her.' },
  { id:'cafe', level:'A1', pt:'No café', en:'Order a coffee', icon:'coffee-cup', scene:'cafe',
    dialogue:[['Bia','Oi! O que vai ser hoje?','Hi! What’ll it be today?'],['Você','Me vê um café com leite?','Can I get a coffee with milk?'],['Bia','Claro! Pão de queijo também?','Sure! Cheese bread too?'],['Você','Bora, dois! Quanto deu?','Let’s go, two! How much is it?'],['Bia','Deu doze reais.','That’s twelve reais.'],['Você','Pode ser no cartão?','Can I pay by card?']],
    chunks:[['Me vê um…?','can I get a…?','What locals say instead of “eu quero” (I want).'],['café com leite','coffee with milk','“sem leite” = without milk'],['pão de queijo','cheese bread','The national snack. Order it.'],['Quanto deu?','how much is it (in total)?',''],['Deu doze reais','it came to twelve reais',''],['Pode ser no cartão?','can it be by card?','“No Pix?” is the other way everyone pays.'],['Só isso','that’s all','']],
    gloss:{'o':'the/what','que':'what','vai':'will/goes','ser':'be','hoje':'today','me':'me','vê':'see (me vê = get me)','um':'a','café':'coffee','com':'with','leite':'milk','claro':'of course','pão':'bread','de':'of','queijo':'cheese','também':'too','bora':'let’s go','dois':'two','quanto':'how much','deu':'came to','doze':'twelve','reais':'reais (money)','pode':'can','no':'on the','cartão':'card'},
    mission:'Order a coffee with milk and a pão de queijo, ask the price and pay by card.' },
  { id:'num', level:'A1', pt:'Números', en:'Numbers & haggling', icon:'brain', scene:'market',
    dialogue:[['Dona Lúcia','Olha a manga docinha!','Look at the sweet mangoes!'],['Você','Quanto é a manga?','How much is the mango?'],['Dona Lúcia','Três por dez reais.','Three for ten reais.'],['Você','Nossa, tá caro! Faz um desconto?','Wow, that’s expensive! Give me a discount?'],['Dona Lúcia','Tá bom, quatro por dez pra você.','Okay, four for ten for you.'],['Você','Fechou!','Deal!']],
    chunks:[['Quanto é…?','how much is…?',''],['um, dois, três, quatro, cinco','one, two, three, four, five','“seis” (6) is “meia” when people read out phone numbers.'],['três por dez reais','three for ten reais',''],['Tá caro!','that’s expensive!','“Tá barato” = it’s cheap.'],['Faz um desconto?','give me a discount?',''],['Fechou!','deal!','Literally “it closed”.'],['Nossa!','wow!','Short for “Nossa Senhora” (Our Lady). Used constantly.']],
    gloss:{'olha':'look','a':'the','manga':'mango','docinha':'nice and sweet','quanto':'how much','é':'is','três':'three','por':'for','dez':'ten','reais':'reais','nossa':'wow','tá':'it’s','caro':'expensive','faz':'do/make','um':'a','desconto':'discount','bom':'good','quatro':'four','pra':'for','você':'you','fechou':'deal'},
    mission:'Ask Dona Lúcia for prices and haggle for a discount.' },
  { id:'onde', level:'A1', pt:'Onde fica…?', en:'Ask directions', icon:'treasure-map', scene:'dir',
    dialogue:[['Você','Com licença, onde fica a praia?','Excuse me, where’s the beach?'],['Rafa','Segue reto e vira à direita.','Go straight and turn right.'],['Você','É longe?','Is it far?'],['Rafa','Não, é pertinho! Uns cinco minutos.','No, it’s super close! About five minutes.'],['Você','Valeu, mano!','Thanks, bro!']],
    chunks:[['Com licença','excuse me',''],['Onde fica…?','where is…? (places)',''],['Segue reto','go straight',''],['Vira à direita / à esquerda','turn right / left',''],['É longe?','is it far?',''],['É pertinho','it’s really close','pertinho = perto (near) + -inho.']],
    gloss:{'com':'with','licença':'permission','onde':'where','fica':'is (located)','a':'the','praia':'beach','segue':'keep going','reto':'straight','e':'and','vira':'turn','à':'to the','direita':'right','é':'is','longe':'far','não':'no','pertinho':'really close','uns':'about','cinco':'five','minutos':'minutes','valeu':'thanks','mano':'bro'},
    mission:'Find out from Rafa how to get to the beach and if it’s far.' },
  { id:'uber', level:'A1', pt:'No Uber', en:'Ride & small talk', icon:'bus', scene:'uber',
    dialogue:[['Seu Zé','Boa noite! Você é o Twister?','Good evening! Are you Twister?'],['Você','Sou eu! Pode ir pra Copacabana?','That’s me! Can you go to Copacabana?'],['Seu Zé','Bora! O ar tá bom?','Let’s go! Is the AC okay?'],['Você','Tá ótimo, valeu.','It’s great, thanks.'],['Seu Zé','Você torce pra qual time?','Which team do you support?'],['Você','Flamengo, claro!','Flamengo, of course!']],
    chunks:[['Sou eu!','that’s me!',''],['Pode ir pra…?','can you go to…?','“pra” is the spoken form of “para” (to/for).'],['Tá ótimo','it’s great',''],['Pode parar aqui','you can stop here',''],['Tá muito trânsito','there’s a lot of traffic',''],['Você torce pra qual time?','which team do you support?','Football is small talk number one. Pick a team before you land.']],
    gloss:{'boa':'good','noite':'night/evening','você':'you','é':'are','o':'the','sou':'am','eu':'I','pode':'can','ir':'go','pra':'to','bora':'let’s go','ar':'air (AC)','tá':'is','bom':'good','ótimo':'great','valeu':'thanks','torce':'support (a team)','qual':'which','time':'team','claro':'of course'},
    mission:'Get Seu Zé to take you to Copacabana and survive his football talk.' },
  { id:'zap', level:'A1', pt:'No zap', en:'Texting like a Brazilian', icon:'smartphone', scene:'zap',
    dialogue:[['Gabi','Oi sumido! Td bem? kkkk','Hey stranger! All good? haha'],['Você','Td sim! E vc?','All good! And you?'],['Gabi','Mds, tô morta de cansada','OMG, I’m dead tired'],['Você','Bora sair hj?','Wanna go out today?'],['Gabi','Bora! Que horas?','Let’s go! What time?'],['Você','Às oito, blz?','At eight, okay?']],
    chunks:[['kkkk','hahaha','Brazilians laugh in k’s. More k’s = funnier.',0,1],['vc = você','you','',0,1],['td = tudo','everything / all','',0,1],['blz = beleza','cool / okay','Say it out loud too: “Beleza!”',0,1],['hj = hoje','today','',0,1],['mds = meu Deus','OMG','',0,1],['Oi sumido!','hey stranger!','For someone who vanished. “Sumida” for a woman.'],['Tô morto de cansado','I’m dead tired','“Tô” = “estou” (I am), always shortened when speaking.']],
    gloss:{'oi':'hi','sumido':'stranger (vanished one)','td':'tudo','bem':'well','kkkk':'haha','sim':'yes','e':'and','vc':'você','mds':'meu Deus (OMG)','tô':'I am','morta':'dead','de':'of','cansada':'tired','bora':'let’s','sair':'go out','hj':'hoje (today)','que':'what','horas':'time','às':'at','oito':'eight','blz':'beleza (ok)'},
    mission:'Text Gabi, make plans for tonight and use at least two abbreviations.' },
  { id:'giria', level:'A1', pt:'Gírias', en:'Street talk & cusses', icon:'flame', scene:'boteco',
    dialogue:[['Léo','Porra, mano, chegou atrasado de novo!','Damn, bro, you’re late again!'],['Você','Foi mal, cara! O trânsito tava uma merda.','My bad, dude! Traffic was shit.'],['Léo','Caralho, sempre a mesma desculpa, hein!','Fuck, always the same excuse, huh!'],['Você','Para de reclamar e pede uma cerveja, seu corno.','Stop whining and order a beer, you cuckold.'],['Léo','Corno é você! Essa rodada é sua, vacilão.','You’re the cuckold! This round’s on you, screw-up.']],
    chunks:[['Cara / Mano','dude / bro','“Mano” is more São Paulo, “cara” is everywhere.',0],['Tá ligado?','you know? / get it?','',0],['Foi mal','my bad','',0],['Bora!','let’s go!','',0],['Que saco!','what a drag!','',1],['Merda','shit','Fine with friends, rude in public.',1],['Porra!','damn! / fuck!','The comma of Brazilian Portuguese: surprise, anger, emphasis. Friends only, never your boss.',1],['Vacilão','screw-up, flake','Teasing. Call a friend this when they mess up.',1],['Corno','cuckold','The classic insult and football chant: “Juiz corno!” (the ref’s a cuckold). Banter between friends; a real insult if you mean it.',2],['Caralho!','fuck! (shock or joy)','“Pra caralho” = a fuckton: “caro pra caralho”.',2],['Puta que pariu!','holy shit! (PQP)','Often typed as “pqp”.',2],['Foda-se','fuck it / screw it','',2],['Vai se foder','go fuck yourself','Real insult. Laugh it off only between close friends.',2],['Macaco','monkey','The animal is just “macaco”. Aimed at a person it’s a racist insult, and in Brazil that’s a crime (injúria racial). Recognise it; never call anyone this.',3],['Macaco preto','“black monkey”','A racist slur. Know it so you can recognise it, never say it to anyone.',3]],
    gloss:{'porra':'damn/fuck','mano':'bro','chegou':'arrived','atrasado':'late','de':'of','novo':'new (de novo = again)','foi':'was','mal':'bad','cara':'dude','o':'the','trânsito':'traffic','tava':'was','uma':'a','merda':'shit','caralho':'fuck','sempre':'always','a':'the','mesma':'same','desculpa':'excuse','hein':'huh','para':'stop','reclamar':'complaining','e':'and','pede':'order','cerveja':'beer','seu':'you (insult intensifier)','corno':'cuckold','é':'is','você':'you','essa':'this','rodada':'round','sua':'yours','vacilão':'screw-up'},
    mission:'Banter with Léo at the boteco: apologise for being late, insult him back and order a beer.' },
  { id:'xinga', level:'A1', pt:'Xingamentos', en:'Insults, comebacks & slurs to recognise', icon:'soccer-ball', scene:'estadio',
    dialogue:[['Caio','Juiz ladrão! Corno!','Thief ref! Cuckold!'],['Você','Que lance foi esse, porra?','What the hell was that play?'],['Caio','Esse zagueiro é um babaca, cara.','That defender is a jerk, dude.'],['Você','Puta merda, que frango do goleiro!','Holy shit, what a howler from the keeper!'],['Caio','Vai tomar no cu, juiz!','Up yours, ref!'],['Você','Calma, mano! Ainda tem jogo.','Easy, bro! There’s still a game on.']],
    chunks:[['Frango','howler (keeper’s blunder)','Literally “chicken”. Pure football slang.',0],['Juiz ladrão!','thief ref!','Every stadium, every Sunday.',1],['Babaca','jerk, idiot','',1],['Otário','sucker, idiot','',1],['Bosta','crap, shit','“Que bosta!” = what crap!',1],['Cacete!','damn!','Softer than “caralho”.',1],['Desgraça!','damn it! (lit. disgrace)','Also “desgraçado” = bastard.',1],['Puta merda!','holy shit!','',2],['Filho da puta','son of a bitch','Insult, but also amazement: “filho da puta, que golaço!”',2],['Cuzão','asshole','',2],['Arrombado','asshole (very rude)','São Paulo favourite.',2],['Vai tomar no cu','up yours / fuck off','Often shortened to “vtnc” in texts.',2],['Corno manso','a cuckold who’s fine with it','Joke insult in banter.',2],['Viado','homophobic slur','Some friends throw it around jokingly, but it’s a slur and offensive to many. Recognise it; don’t use it.',3],['Crioulo','racist slur','Racist. Recognise it; never use it.',3],['Sapatão','slur for lesbians','Reclaimed by some lesbians themselves; offensive from outsiders. Recognise it only.',3]],
    gloss:{'juiz':'referee','ladrão':'thief','corno':'cuckold','que':'what','lance':'play/move','foi':'was','esse':'that','porra':'damn','zagueiro':'defender','é':'is','um':'a','babaca':'jerk','cara':'dude','puta':'whore (puta merda = holy shit)','merda':'shit','frango':'howler (lit. chicken)','do':'of the','goleiro':'goalkeeper','vai':'go','tomar':'take','no':'in the','cu':'ass','calma':'calm','mano':'bro','ainda':'still','tem':'there is','jogo':'game'},
    mission:'Watch the game with Caio: curse the ref, react to the keeper’s blunder and calm him down.' },
  { id:'rest', level:'A2', pt:'No restaurante', en:'Order a full meal', icon:'crown', scene:'rest',
    dialogue:[['Tião','Já escolheram?','Have you chosen yet?'],['Você','Ainda não. O que você recomenda?','Not yet. What do you recommend?'],['Tião','A feijoada tá uma delícia hoje.','The feijoada is delicious today.'],['Você','Então vou querer uma feijoada e um guaraná.','Then I’ll have a feijoada and a guaraná.'],['Tião','Gelado ou natural?','Cold or room temperature?'],['Você','Bem gelado. E traz a conta depois, por favor.','Nice and cold. And bring the bill after, please.']],
    chunks:[['Já escolheram?','have you (all) chosen?',''],['O que você recomenda?','what do you recommend?',''],['Tá uma delícia','it’s delicious',''],['Vou querer…','I’ll have…','“vou” + verb is the easy future: vou comer, vou pagar.'],['Bem gelado','nice and cold','“bem” before an adjective = very.'],['Traz a conta','bring the bill',''],['Tô cheio','I’m full','“Tô cheia” for a woman.']],
    gloss:{'já':'already','escolheram':'chose','ainda':'still','não':'not','o':'the','que':'what','você':'you','recomenda':'recommend','a':'the','feijoada':'bean & pork stew','tá':'is','uma':'a','delícia':'delight','hoje':'today','então':'then','vou':'I will','querer':'want','e':'and','um':'a','guaraná':'guaraná soda','gelado':'cold','ou':'or','natural':'room temperature','bem':'very','traz':'bring','conta':'bill','depois':'after','por':'for','favor':'favour'},
    mission:'Ask Tião for a recommendation, order food and a drink, and ask for the bill.' },
  { id:'fds', level:'A2', pt:'Fim de semana', en:'Make plans', icon:'sparkles', scene:'party',
    dialogue:[['Júlia','O que você vai fazer no fim de semana?','What are you doing this weekend?'],['Você','Vou pra praia no sábado. E você?','I’m going to the beach on Saturday. And you?'],['Júlia','Vou num show no domingo. Quer ir?','I’m going to a concert on Sunday. Wanna come?'],['Você','Quero! Que horas começa?','Yes! What time does it start?'],['Júlia','Às nove. A gente se encontra lá?','At nine. Shall we meet there?'],['Você','Fechado! Até domingo.','Deal! See you Sunday.']],
    chunks:[['O que você vai fazer…?','what are you going to do…?',''],['Vou pra praia','I’m going to the beach',''],['no sábado / no domingo','on Saturday / on Sunday',''],['Quer ir?','wanna go?',''],['Que horas começa?','what time does it start?',''],['A gente se encontra lá?','shall we meet there?','“A gente” = we, in everyday speech (instead of “nós”).'],['Fechado!','deal!','']],
    gloss:{'o':'the','que':'what','você':'you','vai':'will','fazer':'do','no':'on the','fim':'end','de':'of','semana':'week','vou':'I go/will','pra':'to the','praia':'beach','sábado':'Saturday','e':'and','num':'to a','show':'concert','domingo':'Sunday','quer':'want','ir':'to go','quero':'I want','horas':'time','começa':'starts','às':'at','nove':'nine','a':'the','gente':'people (a gente = we)','se':'each other','encontra':'meet','lá':'there','fechado':'deal','até':'until'},
    mission:'Make weekend plans with Júlia: where, when and where to meet.' },
];

const SCENES = [
  { id:'lucy', icon:'lucy', c:'var(--peach)', pt:'Fala com a Lucy', en:'Chat with Lucy herself', who:'Lucy', role:'Lucy, Twister’s dilute-calico cat (grey, peach and white, big olive eyes) who secretly speaks Brazilian Portuguese. She is judgy, dramatic, sarcastic, sleeps on Twister’s keyboard, demands food and roasts Twister constantly but obviously loves them', mins:5,
    script:[['Ah, finalmente. Cadê minha comida, humano?','Oh, finally. Where’s my food, human?',['Calma, Lucy!','Já vou!','Você comeu agora!']],
            ['Mentira. Eu tô morrendo de fome. Olha essa cara.','Lies. I’m starving. Look at this face.',['Que drama!','Tá bom, tá bom.','Você é muito fofa.']],
            ['Eu sei que sou fofa. Agora sai do teclado, é meu.','I know I’m cute. Now get off the keyboard, it’s mine.',['O teclado é meu!','Por quê?','Tá, Lucy.']],
            ['Boa noite. Vou dormir aqui. Não me acorda. 😼','Good night. I’m sleeping here. Don’t wake me.',['Boa noite, Lucy!','Dorme bem!','Folgada!']]] },
  { id:'boteco', icon:'flame', c:'var(--rose)', pt:'No boteco', en:'Beers & banter with a friend', who:'Léo', role:'Twister’s loud, sarcastic best friend at a boteco (bar) in Rio who swears constantly and roasts everyone', mins:5,
    script:[['Porra, finalmente! Achei que você tinha morrido, mano.','Damn, finally! I thought you’d died, bro.',['Foi mal, cara!','Cala a boca, Léo.','Bora pedir uma cerveja?']],
            ['Tá, tá. Cerveja ou caipirinha, seu vacilão?','Yeah yeah. Beer or caipirinha, you screw-up?',['Uma cerveja!','Caipirinha, porra!','Tanto faz.']],
            ['Caralho, olha o preço disso! Tá caro pra caramba.','Fuck, look at that price! It’s crazy expensive.',['Puta que pariu!','Relaxa, eu pago.','Que merda, hein.']],
            ['Beleza, a rodada é sua então, corno. Saúde! 🍻','Cool, the round is on you then, cuckold. Cheers!',['Saúde!','Corno é você!','Vai se foder, Léo 😂']]] },
  { id:'estadio', icon:'soccer-ball', c:'var(--rose)', pt:'No estádio', en:'Curse the ref with a fan', who:'Caio', role:'a furious, foul-mouthed, hilarious football fan at the Maracanã who curses the referee and players nonstop (juiz ladrão, corno, filho da puta, vai tomar no cu, babaca, frango) but is friendly to Twister', mins:5,
    script:[['Juiz ladrão! Viu isso, mano?!','Thief ref! Did you see that, bro?!',['Que lance foi esse, porra?','Vi sim!','Juiz corno!']],
            ['Pênalti claro! Esse juiz é um filho da puta.','Clear penalty! This ref is a son of a bitch.',['Puta merda!','Calma, mano.','Que babaca!']],
            ['E o goleiro? Que frango, caralho!','And the keeper? What a howler, fuck!',['Que frango!','Vai tomar no cu, goleiro!','Desgraça!']],
            ['Gooool! Caralho, que golaço! Te amo, mano! 😂','Goooal! Fuck, what a goal! Love you, bro!',['Golaço!','Filho da puta, que gol!','Bora!']]] },
  { id:'cafe', icon:'coffee-cup', c:'var(--olive)', pt:'No café', en:'Order coffee & pão de queijo', who:'Bia', role:'a sarcastic, funny barista at a café in Rio de Janeiro who teases regulars', mins:3,
    script:[['Oi! Bom dia! O que vai ser hoje?','Hi! Good morning! What’ll it be today?',['Um café, por favor.','Me vê um pão de queijo?','Tem suco?']],
            ['Com leite ou sem leite? Pensa rápido, a fila tá enorme 😏','With or without milk? Think fast, the line is huge.',['Com leite.','Sem leite.','Tanto faz.']],
            ['Beleza! Mais alguma coisa?','Great! Anything else?',['Só isso, valeu.','Um pão de queijo também.','Quanto deu?']],
            ['Deu doze reais. Cartão ou Pix?','That’s twelve reais. Card or Pix?',['Cartão.','Pix, pode ser?','Dinheiro.']],
            ['Tá pago! Volta amanhã, viu? ☕','All paid! Come back tomorrow, okay?',['Valeu! Tchau!','Até amanhã!','Pode deixar!']]] },
  { id:'market', icon:'shop', c:'var(--mint)', pt:'Na feira', en:'Prices & haggling', who:'Dona Lúcia', role:'a cheeky fruit seller at a street market (feira) in Belo Horizonte who haggles hard and jokes a lot', mins:4,
    script:[['Olha a manga docinha! O que vai ser, meu bem?','Look at the sweet mangoes! What will it be, dear?',['Quanto é a manga?','Quero bananas.','Bom dia!']],
            ['Três mangas por dez reais!','Three mangoes for ten reais!',['Tá caro!','Fechou!','Faz um desconto?']],
            ['Ai, você me quebra... Quatro por dez, só pra você.','Oh, you’re killing me… Four for ten, just for you.',['Fechou!','Valeu!','Cinco por dez?']],
            ['Deu dez reais. Volta sempre, viu?','That’s ten reais. Come back anytime!',['Obrigado!','Até a próxima!','Tchau!']]] },
  { id:'uber', icon:'bus', c:'var(--sky)', pt:'No Uber', en:'Ride & football talk', who:'Seu Zé', role:'a chatty Uber driver in Rio who complains about traffic and is obsessed with football (Vasco fan) and teases Flamengo fans', mins:4,
    script:[['Boa noite! Você é o Twister?','Good evening! Are you Twister?',['Sou eu!','Boa noite!','Pode ir pra Copacabana?']],
            ['Bora. Ih, olha esse trânsito, que saco.','Let’s go. Ugh, look at this traffic, what a drag.',['Tá muito trânsito!','Relaxa.','Que saco mesmo.']],
            ['Você torce pra qual time?','Which team do you support?',['Flamengo!','Não gosto de futebol.','E você?']],
            ['Flamengo?! Pode descer aqui mesmo 😂 Brincadeira!','Flamengo?! You can get out right here. Kidding!',['Haha, valeu!','Pode parar aqui.','Que maldade!']]] },
  { id:'zap', icon:'smartphone', c:'var(--violet)', pt:'No zap', en:'Text a friend', who:'Gabi', role:'a dramatic friend texting on WhatsApp who writes in Brazilian internet slang (kkkk, vc, td, blz, hj, mds, pq) and short messages', mins:3,
    script:[['oi sumido!! td bem? kkkk','hey stranger!! all good? haha',['td sim! e vc?','oi gabi!','mds, sumi mesmo kkk']],
            ['mds tô morta de cansada','omg I’m dead tired',['pq?','bora sair hj?','coitada kkk']],
            ['bora! q horas?','let’s go! what time?',['às 8, blz?','às 9!','vc escolhe']],
            ['fechou!! até mais 😘','deal!! see you',['blz!','até!','kkkk']]] },
  { id:'rest', icon:'crown', c:'var(--peach)', pt:'No restaurante', en:'Order a full meal', who:'Tião', role:'a sarcastic old waiter at a traditional restaurant in Rio who has seen everything', mins:5,
    script:[['Já escolheram?','Have you chosen yet?',['Ainda não.','O que você recomenda?','Uma feijoada!']],
            ['A feijoada tá uma delícia. Se não gostar, a culpa é sua.','The feijoada is delicious. If you don’t like it, that’s on you.',['Vou querer uma.','Tem peixe?','Haha, tá bom.']],
            ['E pra beber?','And to drink?',['Um guaraná.','Uma cerveja bem gelada.','Água, por favor.']],
            ['Tá aqui. Quando quiser a conta, é só gritar.','Here you go. When you want the bill, just shout.',['Traz a conta, por favor.','Tô cheio!','Valeu!']]] },
  { id:'party', icon:'shaking-hands', c:'var(--lilac)', pt:'Conhecendo alguém', en:'Small talk at a party', who:'Júlia', role:'a playful, friendly guest at a birthday party in Salvador who loves to joke', mins:5,
    script:[['Oi! Acho que a gente não se conhece. Eu sou a Júlia!','Hi! I don’t think we’ve met. I’m Júlia!',['Prazer! Meu nome é Twister.','Oi, Júlia!','E aí, tudo bem?']],
            ['Prazer! De onde você é?','Nice to meet you! Where are you from?',['Eu sou do Egito.','Sou do Cairo.','E você?']],
            ['Que legal! E fala português ou só finge? 😜','How cool! Do you speak Portuguese or just pretend?',['Só um pouquinho!','Estou aprendendo.','Finjo muito bem.']],
            ['Haha, gostei! Vem, vou te apresentar pro pessoal!','Haha, I like you! Come, I’ll introduce you to everyone!',['Bora!','Vamos!','Valeu!']]] },
  { id:'dir', icon:'treasure-map', c:'var(--sky)', pt:'Pedindo direções', en:'“Onde fica a praia?”', who:'Rafa', role:'a laid-back surfer in Copacabana who jokes about tourists', mins:5,
    script:[['Opa, perdido, gringo? 😂','Hey, lost, gringo?',['Onde fica a praia?','Com licença, estou perdido.','Onde tem um banheiro?']],
            ['A praia? É pertinho! Segue reto e vira à direita.','The beach? It’s super close! Go straight and turn right.',['É longe?','À direita?','Valeu!']],
            ['Uns cinco minutos. Até você consegue.','About five minutes. Even you can make it.',['Valeu, mano!','Engraçadinho...','Obrigado!']],
            ['De nada! Cuidado com o sol, hein! 🌴','You’re welcome! Watch out for the sun, huh!',['Tchau!','Valeu!','Pode deixar!']]] },
];

const PHRASES = {
  'Street talk':[['Porra, que caro!','Damn, that’s expensive!','/ˈpo.ʁɐ ki ˈka.ɾu/'],['Foi mal, cara!','My bad, dude!','/foj ˈmaw ˈka.ɾɐ/'],['Tá ligado?','You know?','/ta liˈga.du/'],['Puta que pariu!','Holy shit!','/ˈpu.tɐ ki paˈɾiw/'],['Corno é você!','You’re the cuckold!','/ˈkoʁ.nu ɛ voˈse/']],
  'Greetings':[['E aí, tudo bem?','Hey, all good?','/i aˈi ˈtu.du bẽj̃/'],['Bom te ver!','Good to see you!','/bõ tʃi ˈveɾ/'],['Boa noite!','Good night!','/ˈbo.ɐ ˈnoj.tʃi/']],
  'Café':[['Me vê um pão de queijo?','Can I get a cheese bread?','/mi ve ũ pɐ̃w̃ dʒi ˈkej.ʒu/'],['Pode ser no cartão?','Can I pay by card?','/ˈpɔ.dʒi seɾ nu kaʁˈtɐ̃w̃/'],['Café com leite, por favor.','Coffee with milk, please.','/kaˈfɛ kõ ˈlej.tʃi puʁ faˈvoʁ/']],
  'Hard sounds':[['Não, obrigado.','No, thank you.','/nɐ̃w̃ o.bɾiˈga.du/'],['Eu trabalho muito.','I work a lot.','/ew tɾaˈba.ʎu ˈmũj̃.tu/'],['O Rio de Janeiro é lindo.','Rio de Janeiro is beautiful.','/u ˈʁi.u dʒi ʒaˈnej.ɾu ɛ ˈlĩ.du/'],['A Lucy dorme no teclado.','Lucy sleeps on the keyboard.','/a ˈlu.si ˈdɔʁ.mi nu teˈkla.du/']],
};

// ---------- levels (CEFR) with time estimates ----------
// Guided learning hours (cumulative) follow Cambridge's published ranges; FSI rates Portuguese as one of the fastest languages for English speakers.
const LEVELS = [
  { id:'A1', name:'Breakthrough', hours:70, phrases:150, acc:70, can:'Greet people, order food, ask prices and directions, text friends.' },
  { id:'A2', name:'Waystage', hours:190, phrases:450, acc:78, can:'Handle everyday errands, talk about plans, your day and the past.' },
  { id:'B1', name:'Threshold', hours:380, phrases:1000, acc:85, can:'Keep a real conversation going, tell stories, deal with most travel situations.' },
  { id:'B2', name:'Vantage', hours:560, phrases:2000, acc:90, can:'Talk with locals at normal speed, joke, argue, follow TV.' },
];

// ---------- state ----------
const store = { get(k, d) { try { const v = localStorage.getItem('lucy-' + k) ?? localStorage.getItem('fala-' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
                set(k, v) { try { localStorage.setItem('lucy-' + k, JSON.stringify(v)); } catch (_) {} } };
const S = { done: store.get('done', {}), xp: store.get('xp', 0), streak: store.get('streak', { n: 0, last: '' }),
  variant: store.get('variant', 'pt-BR'), vibe: store.get('vibe', 'spicy'), srs: store.get('srs', {}), goalMin: store.get('goalMin', 20),
  stats: store.get('stats', { secs: {}, scores: [], tricky: {}, shadowed: 0, chats: 0, calls: 0, dict: [] }),
  custom: store.get('custom', []), name: store.get('name', 'Twister'), voices: store.get('voices', { f: 'airy', m: 'buttery', you: 'rounded' }), course: store.get('course', 'pt-BR'), deck: 'Street talk', phrase: 0, scene: 'lucy', mission: null };
// ---------- profile name (data is written with "Twister"; swap in the chosen name) ----------
let NAME_IN_DATA = 'Twister';
function applyName(to) {
  to = (to || '').trim() || 'Twister'; const from = NAME_IN_DATA; if (from === to) return;
  const re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  const walk = o => { for (const k in o) { const v = o[k]; if (typeof v === 'string') o[k] = v.replace(re, to); else if (v && typeof v === 'object') walk(v); } };
  walk(UNITS); walk(SCENES); walk(S.custom); NAME_IN_DATA = to;
}
applyName(S.name);

// ---------- languages: one course is live, the rest have room to plug in ----------
const COURSES = [
  { id: 'pt-BR', name: 'Português', sub: 'Brazil', ready: true },
  { id: 'es', name: 'Español', sub: 'coming later', ready: false },
  { id: 'it', name: 'Italiano', sub: 'coming later', ready: false },
  { id: 'fr', name: 'Français', sub: 'coming later', ready: false },
  { id: 'ja', name: '日本語', sub: 'coming later', ready: false },
];

// ---------- cloud save: the same progress on every device ----------
const SYNC_KEYS = ['done', 'xp', 'streak', 'srs', 'stats', 'custom', 'goalMin', 'vibe', 'variant', 'name', 'voices', 'course'];
const Sync = { ref: null, state: 'local', at: store.get('savedAt', 0), timer: null,
  snapshot() { const o = {}; SYNC_KEYS.forEach(k => o[k] = S[k]); return o; },
  touch() { this.at = Date.now(); try { localStorage.setItem('lucy-savedAt', JSON.stringify(this.at)); } catch (_) {} if (this.ref) { clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 2500); } },
  async push() { if (!this.ref) return; try { await this.ref.set({ blob: JSON.stringify(this.snapshot()), at: this.at, v: 1 }); this.state = 'synced'; } catch (e) { this.state = 'error'; this.err = e?.code || e?.message; } },
  async connect(ref) { this.ref = ref; this.state = 'syncing'; let pulled = false;
    try { const snap = await Promise.race([ref.get(), sleep(10000).then(() => null)]); const r = snap?.exists ? snap.data() : null;
      if (r && r.at > this.at) { this.apply(JSON.parse(r.blob)); this.at = r.at; try { localStorage.setItem('lucy-savedAt', JSON.stringify(r.at)); } catch (_) {} this.state = 'synced'; pulled = true; }
      else await this.push(); } catch (e) { this.state = 'error'; this.err = e?.code || e?.message; }
    return pulled; },
  apply(o) { SYNC_KEYS.forEach(k => { if (o[k] !== undefined) { S[k] = o[k]; try { localStorage.setItem('lucy-' + k, JSON.stringify(o[k])); } catch (_) {} } }); applyName(S.name); },
};
{ const set0 = store.set; store.set = (k, v) => { set0(k, v); if (SYNC_KEYS.includes(k)) Sync.touch(); }; }
const todayKey = () => new Date().toISOString().slice(0, 10);
const saveStats = () => store.set('stats', S.stats);
function addXP(n) {
  const t = todayKey(); S.xp += n;
  if (S.streak.last !== t) { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); S.streak = { n: S.streak.last === y ? S.streak.n + 1 : 1, last: t }; }
  store.set('xp', S.xp); store.set('streak', S.streak);
}
function logScore(target, r) {
  S.stats.scores.push(r.total); if (S.stats.scores.length > 300) S.stats.scores.shift();
  target.replace(/[!?.,…]/g, '').split(/\s+/).forEach((w, i) => { const k = w.toLowerCase(); if (k.length > 1 && (r.per[i] ?? 0) < .5) S.stats.tricky[k] = (S.stats.tricky[k] || 0) + 1; else if (S.stats.tricky[k] && (r.per[i] ?? 0) >= .85) S.stats.tricky[k] = Math.max(0, S.stats.tricky[k] - 1); });
  saveStats();
}
// active study time: counted while the page is visible and you touched it in the last minute
let lastActive = Date.now();
['pointerdown', 'keydown'].forEach(e => addEventListener(e, () => lastActive = Date.now(), { passive: true }));
setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - lastActive < 60e3) { const t = todayKey(); S.stats.secs[t] = (S.stats.secs[t] || 0) + 15; saveStats(); } }, 15e3);

// ---------- spaced repetition (Leitner boxes, answered by speaking) ----------
const BOX_DAYS = [0, 1, 3, 7, 16, 35, 90];
function srsAdd(items) { items.filter(c => (c[3] ?? 0) < 3).forEach(([pt, en, , heat, ns]) => { if (!S.srs[pt]) S.srs[pt] = { en, heat: heat || 0, box: 0, due: Date.now(), ns: ns ? 1 : 0 }; }); store.set('srs', S.srs); }
function srsDue() { const now = Date.now(); return Object.entries(S.srs).filter(([, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due); }
function srsGrade(pt, g) { const c = S.srs[pt]; if (!c) return;
  if (g === 'again') { c.box = 0; c.due = Date.now() + 10 * 60e3; }
  else if (g === 'hard') { c.due = Date.now() + Math.max(1, BOX_DAYS[c.box] / 2) * 864e5; }
  else { c.box = Math.min(BOX_DAYS.length - 1, c.box + 1); c.due = Date.now() + BOX_DAYS[c.box] * 864e5; }
  store.set('srs', S.srs); }
const nextLabel = (pt, g) => { const c = S.srs[pt] || { box: 0 }; const d = g === 'again' ? 0 : g === 'hard' ? Math.max(1, BOX_DAYS[c.box] / 2) : BOX_DAYS[Math.min(BOX_DAYS.length - 1, c.box + 1)]; return g === 'again' ? '10 min' : d < 1.5 ? '1 day' : Math.round(d) + ' days'; };

// ---------- progress model ----------
function metrics() {
  const secs = Object.values(S.stats.secs).reduce((a, b) => a + b, 0), hours = secs / 3600;
  const cards = Object.values(S.srs), learned = cards.length, mastered = cards.filter(c => c.box >= 3).length;
  const sc = S.stats.scores.slice(-40), acc = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null;
  const days = [...Array(14)].map((_, i) => S.stats.secs[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] || 0);
  const activeDays = days.filter(s => s > 60).length;
  const pace = activeDays >= 3 ? days.reduce((a, b) => a + b, 0) / 60 / 14 : S.goalMin;   // minutes per day
  const phraseCredit = mastered + (learned - mastered) * .4;
  const lv = LEVELS.map((L, i) => {
    const prevH = i ? LEVELS[i - 1].hours : 0, prevP = i ? LEVELS[i - 1].phrases : 0;
    const hp = Math.max(0, Math.min(1, (hours - prevH) / (L.hours - prevH))), pp = Math.max(0, Math.min(1, (phraseCredit - prevP) / (L.phrases - prevP)));
    const ap = acc == null ? 0 : Math.min(1, acc / L.acc);
    const pct = Math.round(100 * (hp * .4 + pp * .4 + ap * .2));
    const quality = acc == null ? 1 : Math.max(.7, Math.min(1.25, acc / L.acc));
    const hoursLeft = Math.max(0, L.hours - hours) / quality;
    const phrasesLeft = Math.max(0, L.phrases - phraseCredit), phraseHours = phrasesLeft / 14;   // ~14 phrases learned well per study hour
    const left = Math.max(hoursLeft, phraseHours);
    const daysLeft = left * 60 / Math.max(5, pace);
    return { ...L, pct, hp, pp, ap, hoursLeft: left, daysLeft, phrasesLeft: Math.round(phrasesLeft) };
  });
  const current = lv.find(l => l.pct < 100) || lv[lv.length - 1];
  const todayMin = Math.round((S.stats.secs[todayKey()] || 0) / 60);
  return { hours, learned, mastered, acc, pace, lv, current, todayMin, days };
}
const fmtETA = d => d < 1 ? 'today' : d < 14 ? `~${Math.round(d)} days` : d < 70 ? `~${Math.round(d / 7)} weeks` : `~${Math.round(d / 30)} months`;
const fmtDate = d => new Date(Date.now() + d * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined });
const MILESTONES = [
  ['Primeira conversa', 'Send your first message to a partner', m => S.stats.chats >= 1],
  ['First call', 'Finish a voice call', m => S.stats.calls >= 1],
  ['10 phrases', 'Have 10 phrases in your review deck', m => m.learned >= 10],
  ['Shadow 25 lines', 'Repeat 25 native lines', m => S.stats.shadowed >= 25],
  ['Survived the boteco', 'Finish the Gírias mission', m => !!S.done.giria],
  ['5-day streak', 'Practise 5 days in a row', m => S.streak.n >= 5],
  ['50 mastered', '50 phrases at 7+ day intervals', m => m.mastered >= 50],
  ['Clear speaker', 'Average 80+ over your last 40 attempts', m => (m.acc || 0) >= 80],
  ['10 hours', 'Ten hours of real practice', m => m.hours >= 10],
  ['Made by you', 'Ask Lucy to write a mission for you', m => S.custom.length >= 1],
  ['A1 reached', 'Hit 100% on A1', m => m.lv[0].pct >= 100],
  ['A2 reached', 'Hit 100% on A2', m => m.lv[1].pct >= 100],
];
