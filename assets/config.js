/* CONFIGURAÇÃO DA LOJA
 * Edite este arquivo com os dados reais antes de vender.
 * Preços em centavos: 15990 = R$ 159,90.
 * whatsapp: somente dígitos, com país + DDD. Vazio = contato pelo Instagram.
 * Nunca coloque chaves de pagamento, senhas ou segredos neste arquivo público.
 */
window.SPI_STORE = {
  name: 'SPI Moda',
  instagram: 'https://www.instagram.com/spi.moda/',
  instagramHandle: '@spi.moda',
  whatsapp: "5524992185519",
  demo: true,
  maxQuantityPerItem: 5,
  products: [
    { id: 'vestido-lumi', name: 'Vestido Lumi', subtitle: 'Leveza em cada movimento', category: 'Roupas', type: 'Vestidos', price: 15990, image: 'assets/images/vestido.jpg', alt: 'Modelo com vestido longo vermelho em movimento', color: 'Vermelho', colorHex: '#a81e36', sizes: ['P', 'M', 'G'], isNew: true, tag: 'NOVO OLHAR', description: 'Uma proposta de vestido longo com movimento e presença. Combine com acessórios discretos e deixe o look acompanhar o seu ritmo.' },
    { id: 'calca-areia', name: 'Calça Aurora', subtitle: 'O essencial com um toque a mais', category: 'Roupas', type: 'Calças', price: 14990, image: 'assets/images/calca.jpg', alt: 'Calça jogger em tom rosado com ajuste nos tornozelos', color: 'Rosé', colorHex: '#c9a995', sizes: ['36', '38', '40', '42'], isNew: true, tag: '', description: 'Linhas simples para explorar muitas combinações. Uma referência de calça casual para acompanhar os encontros e os passeios de fim de tarde.' },
    { id: 'camiseta-essential', name: 'Camiseta Casual', subtitle: 'O começo de boas combinações', category: 'Roupas', type: 'Blusas', price: 6990, image: 'assets/images/camisa.jpg', alt: 'Modelo com camiseta branca estampada', color: 'Branco', colorHex: '#f1efea', sizes: ['P', 'M', 'G', 'GG'], isNew: false, tag: 'ESSENCIAL', description: 'O básico que abre espaço para a sua personalidade. Uma camiseta para compor looks casuais e experimentar novas sobreposições.' },
    { id: 'bolsa-classica', name: 'Bolsa Mini Clássica', subtitle: 'Pequena no tamanho, cheia de estilo', category: 'Acessórios', type: 'Bolsas', price: 11990, image: 'assets/images/bolsa.jpg', alt: 'Bolsa rosa com detalhes amarelos e alça de corrente', color: 'Rosa', colorHex: '#e0b5ba', sizes: ['Único'], isNew: true, tag: '', description: 'Um detalhe marcante para levar o essencial. A proposta de bolsa compacta completa produções do dia a dia e ocasiões especiais.' },
    { id: 'casaco-urban', name: 'Casaco Urban', subtitle: 'Uma nova camada de personalidade', category: 'Roupas', type: 'Casacos', price: 23990, image: 'assets/images/casaco.jpg', alt: 'Modelo com casaco em uma composição urbana', color: 'Caramelo', colorHex: '#b28d69', sizes: ['P', 'M', 'G'], isNew: false, tag: '', description: 'A terceira peça que muda a composição. Inspire-se na silhueta clássica e combine com suas peças favoritas em dias de temperatura mais amena.' },
    { id: 'jeans-everyday', name: 'Jeans Everyday', subtitle: 'Seu parceiro de todos os dias', category: 'Roupas', type: 'Calças', price: 13990, image: 'assets/images/jeans.jpg', alt: 'Calças jeans em diferentes tons de azul', color: 'Azul', colorHex: '#597994', sizes: ['36', '38', '40', '42', '44'], isNew: false, tag: 'ESSENCIAL', description: 'Um convite a composições descomplicadas. O jeans atravessa estações e combina com o que o seu dia pedir.' },
    { id: 'conjunto-solar', name: 'Conjunto Solar', subtitle: 'Cor para acompanhar o seu dia', category: 'Roupas', type: 'Conjuntos', price: 24990, image: 'assets/images/lookbook.jpg', alt: 'Modelo com conjunto amarelo em cenário urbano', color: 'Amarelo', colorHex: '#d9b43c', sizes: ['P', 'M', 'G'], isNew: true, tag: 'NOVO OLHAR', description: 'Uma referência de conjunto com presença e personalidade. Use as peças juntas ou imagine novas combinações com o seu guarda-roupa.' },
    { id: 'casaco-horizonte', name: 'Casaco Horizonte', subtitle: 'Um pouco de céu no seu look', category: 'Roupas', type: 'Casacos', price: 27990, image: 'assets/images/hero.jpg', alt: 'Modelo com casaco azul em um editorial de moda', color: 'Azul céu', colorHex: '#91aec4', sizes: ['P', 'M', 'G'], isNew: false, tag: '', description: 'Uma camada de cor para deixar os dias mais interessantes. Inspire-se em uma composição elegante e adapte ao seu próprio estilo.' }
  ]
};
/* Imagens das categorias no menu. */

window.SPI_MENU_IMAGES = {
  "Roupas": "assets/images/menu-roupas.jpg",
  "Calçados": "assets/images/menu-sapatos.jpg",
  "Bolsas": "assets/images/menu-bolsas.jpg",
  "Acessórios": "assets/images/menu-acessorios.jpg",
  "Copos": "assets/images/menu-copos.jpg"
};