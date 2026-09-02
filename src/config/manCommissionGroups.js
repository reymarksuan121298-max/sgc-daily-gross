export const MAN_COMMISSION_GROUPS = [
  {
    id: 'rws',
    title: 'RWS',
    tellers: [
      'BASLAG, EVELYN',
      'CALOPEZ, MERY JORGIE',
      'CAMANCE, MARILOU',
      'CARMELITA CATUBAY',
      'GARAN, ANALIZA',
      'GENALYN GARCIA',
      'LUMANOG, MELANIE',
      'MONTILLANO, VEA',
      'PATAC, VIRGINIA',
      'QUISIMONDO, JOAN',
      'ROQUESA, PRINCIPAL',
      'ROSELITO, COYOCA',
      'SAPANTA, MARY QUEEN',
      'Rodelyn L Seno',
      'SILVA, MARILOU',
      'TORREFRANCA, JOCEVIL',
      'TORREGOSA, JUCEL'
    ]
  },
  {
    id: 'pnp_commission',
    title: 'PNP COMMISION',
    tellers: [
      'RAQUEL, ALBARACIN',
      'LUTARIO TAMARION',
      'GEORGINA OBSEQUIAS',
      'HAYANISAH SAIPODEN',
      'SOON, CHERYL',
      'MARIYLN, VILASVILAS',
      'LATONIO, DONABEL',
      'LIBRADILLA, ARCEL',
      'LIBONGCOGON, PERCEVERANDA',
      'HERMOSILLA, LISALITA',
      'HOYOHOY, ADELA',
      'MARY ANN LAYOS',
      'DELFIN, MARIA NITA'
    ]
  },
  {
    id: 'group_c',
    title: 'COORDINATOR: GROUP C',
    tellers: [
      'ANNALYN OCHEA',
      'TAURAC, NORHIDA IHT',
      'TORILLAS, JOSEPHINE JOY',
      'MARILYN, MONTEJO'
    ]
  },
  {
    id: 'group_d',
    title: 'COORDINATOR: GROUP D',
    tellers: [
      'JUDY ANN FUENTES'
    ]
  },
  {
    id: 'group_g',
    title: 'COORDINATOR: GROUP G',
    tellers: [
      'MARY ANN, CATIPAY',
      'JOY RAGAS'
    ]
  },
  {
    id: 'kapitan',
    title: 'COORDINATOR: KAPITAN',
    tellers: [
      'gAVIOLA, REYMARK'
    ]
  },
  {
    id: 'spvr_apple',
    title: 'SPVR-APPLE',
    tellers: [
      'Yoly Baculi',
      'INES DELA CERNA',
      'MIRAFLOR MANATAD',
      'CABALLERO, EVANGELINE',
      'Merilyn Gabutero',
      'Clarice Mae Arnilla'
    ]
  },
  {
    id: 'longwind',
    title: 'COORDINATOR: LONGWIND',
    tellers: [
      'JOANE DUMALAGAN'
    ]
  },
  {
    id: 'group_edik',
    title: 'COORDINATOR: GROUP EDIK',
    tellers: [
      'UROT, MERCEDITA'
    ]
  },
  {
    id: 'spvr_molly',
    title: 'SPVR-MOLLY',
    tellers: [
      'ESTELA B. PANUNCIAL',
      'Chyros Roa',
      'Ma. Genale T. Ortega',
      'Sheila Marie N. Romarate',
      'Marilou Gicano',
      'MARICEL INGENTE',
      'Tirso M. Lucernas Jr.',
      'Marianne Bernales',
      'Geraldine Caldito',
      'HAZEL R. MINGUITO',
      'Ma. Liberty S. Lambo',
      'Jia Christi Manatad',
      'Mary Ann Y. Pevida',
      'Jennifer S. Francisco',
      'Abner I. Francisco',
      'LIEZL L. PUNSALAN',
      'Rodel B. Oriondo',
      'JENELY A. SIATON',
      'Naryl mae Tuñacao',
      'JENEFER B. CHAVEZ',
      'Alexis Garcia',
      'LESLIE S. DESABILLE',
      'Fabian G. Medina',
      'ANNABEL T. BORRINAGA',
      'Janet Arcenal',
      'Orven E. Estrada',
      'Jimmy Anchero',
      'ALBERT T. PUNSALAN',
      'Jerson Amad',
      'Eny Pongase',
      'Robinaldo Sinogbuhan',
      'Carmel Matunog',
      'Lory Ann Rabadon',
      'Analyn P. Cayasan'
    ]
  }
];

// Helper to normalize strings for robust matching
export function normalizeName(str) {
  if (!str) return '';
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}
