import type { Member, Relationship, Tree } from '../types'

export const DEMO_TREE_ID = 'got-demo-tree'
export const DEMO_OWNER_NODE_ID = 'm_ned' // Ned Stark

export const DEMO_TREE: Tree = {
  id: DEMO_TREE_ID,
  name: 'Game of Thrones Cast (Demo)',
  owner_id: 'system',
  visibility: 'public',
  created_at: new Date().toISOString(),
  member_count: 35,
  my_role: 'viewer'
}

export const GOT_MEMBERS: Member[] = [
  // --- HOUSE STARK ---
  { id: 'm_rickard', tree_id: DEMO_TREE_ID, user_id: null, name: 'Rickard Stark', gender: 'male', dob: null, dod: null, photo_url: null, bio: null, occupation: 'Lord of Winterfell', location: 'Winterfell', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_lyarra', tree_id: DEMO_TREE_ID, user_id: null, name: 'Lyarra Stark', gender: 'female', dob: null, dod: null, photo_url: null, bio: null, occupation: null, location: 'Winterfell', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: DEMO_OWNER_NODE_ID, tree_id: DEMO_TREE_ID, user_id: null, name: 'Eddard (Ned) Stark', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'Warden of the North', occupation: 'Lord of Winterfell', location: 'Winterfell', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_catelyn', tree_id: DEMO_TREE_ID, user_id: null, name: 'Catelyn Stark', gender: 'female', dob: null, dod: null, photo_url: null, bio: 'Born of House Tully', occupation: 'Lady of Winterfell', location: 'Winterfell', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_robb', tree_id: DEMO_TREE_ID, user_id: null, name: 'Robb Stark', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Young Wolf', occupation: 'King in the North', location: null, is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_sansa', tree_id: DEMO_TREE_ID, user_id: null, name: 'Sansa Stark', gender: 'female', dob: null, dod: null, photo_url: null, bio: 'Queen in the North', occupation: null, location: 'Winterfell', is_living: true, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_arya', tree_id: DEMO_TREE_ID, user_id: null, name: 'Arya Stark', gender: 'female', dob: null, dod: null, photo_url: null, bio: 'No One', occupation: null, location: null, is_living: true, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_bran', tree_id: DEMO_TREE_ID, user_id: null, name: 'Bran Stark', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Three-Eyed Raven', occupation: 'King of the Andals and the First Men', location: 'King\'s Landing', is_living: true, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_rickon', tree_id: DEMO_TREE_ID, user_id: null, name: 'Rickon Stark', gender: 'male', dob: null, dod: null, photo_url: null, bio: null, occupation: null, location: null, is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_jon', tree_id: DEMO_TREE_ID, user_id: null, name: 'Jon Snow', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The White Wolf', occupation: 'Lord Commander of the Night\'s Watch', location: 'The Wall', is_living: true, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_lyanna', tree_id: DEMO_TREE_ID, user_id: null, name: 'Lyanna Stark', gender: 'female', dob: null, dod: null, photo_url: null, bio: null, occupation: null, location: null, is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_benjen', tree_id: DEMO_TREE_ID, user_id: null, name: 'Benjen Stark', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'First Ranger', occupation: 'Night\'s Watch', location: 'The Wall', is_living: false, created_by: 'system', created_at: new Date().toISOString() },

  // --- HOUSE LANNISTER ---
  { id: 'm_tywin', tree_id: DEMO_TREE_ID, user_id: null, name: 'Tywin Lannister', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'Warden of the West', occupation: 'Lord of Casterly Rock', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_joanna', tree_id: DEMO_TREE_ID, user_id: null, name: 'Joanna Lannister', gender: 'female', dob: null, dod: null, photo_url: null, bio: null, occupation: null, location: 'Casterly Rock', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_cersei', tree_id: DEMO_TREE_ID, user_id: null, name: 'Cersei Lannister', gender: 'female', dob: null, dod: null, photo_url: null, bio: 'Queen of the Andals', occupation: 'Queen Regent', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_jaime', tree_id: DEMO_TREE_ID, user_id: null, name: 'Jaime Lannister', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Kingslayer', occupation: 'Lord Commander of the Kingsguard', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_tyrion', tree_id: DEMO_TREE_ID, user_id: null, name: 'Tyrion Lannister', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Imp', occupation: 'Hand of the King', location: 'King\'s Landing', is_living: true, created_by: 'system', created_at: new Date().toISOString() },

  // --- HOUSE BARATHEON ---
  { id: 'm_robert', tree_id: DEMO_TREE_ID, user_id: null, name: 'Robert Baratheon', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'First of His Name', occupation: 'King of the Andals', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_joffrey', tree_id: DEMO_TREE_ID, user_id: null, name: 'Joffrey Baratheon', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'First of His Name', occupation: 'King of the Andals', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_myrcella', tree_id: DEMO_TREE_ID, user_id: null, name: 'Myrcella Baratheon', gender: 'female', dob: null, dod: null, photo_url: null, bio: null, occupation: 'Princess', location: 'Dorne', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_tommen', tree_id: DEMO_TREE_ID, user_id: null, name: 'Tommen Baratheon', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'First of His Name', occupation: 'King of the Andals', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },

  // --- HOUSE TARGARYEN ---
  { id: 'm_aerys', tree_id: DEMO_TREE_ID, user_id: null, name: 'Aerys II Targaryen', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Mad King', occupation: 'King of the Andals', location: 'King\'s Landing', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_rhaella', tree_id: DEMO_TREE_ID, user_id: null, name: 'Rhaella Targaryen', gender: 'female', dob: null, dod: null, photo_url: null, bio: null, occupation: 'Queen Consort', location: 'Dragonstone', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_rhaegar', tree_id: DEMO_TREE_ID, user_id: null, name: 'Rhaegar Targaryen', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'Prince of Dragonstone', occupation: null, location: null, is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_viserys', tree_id: DEMO_TREE_ID, user_id: null, name: 'Viserys Targaryen', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Beggar King', occupation: null, location: 'Essos', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_daenerys', tree_id: DEMO_TREE_ID, user_id: null, name: 'Daenerys Targaryen', gender: 'female', dob: null, dod: null, photo_url: null, bio: 'Mother of Dragons', occupation: 'Queen of the Andals', location: 'Meereen', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_khal_drogo', tree_id: DEMO_TREE_ID, user_id: null, name: 'Khal Drogo', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Great Khal', occupation: 'Khal of the Dothraki', location: 'Vaes Dothrak', is_living: false, created_by: 'system', created_at: new Date().toISOString() },

  // --- HOUSE BOLTON ---
  { id: 'm_roose', tree_id: DEMO_TREE_ID, user_id: null, name: 'Roose Bolton', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'Lord of the Dreadfort', occupation: 'Warden of the North', location: 'Winterfell', is_living: false, created_by: 'system', created_at: new Date().toISOString() },
  { id: 'm_ramsay', tree_id: DEMO_TREE_ID, user_id: null, name: 'Ramsay Bolton', gender: 'male', dob: null, dod: null, photo_url: null, bio: 'The Bastard of Bolton', occupation: 'Lord of Winterfell', location: 'Winterfell', is_living: false, created_by: 'system', created_at: new Date().toISOString() }
]

export const GOT_RELATIONSHIPS: Relationship[] = [
  // --- HOUSE STARK RELATIONSHIPS ---
  { id: 'r_rickard_lyarra', tree_id: DEMO_TREE_ID, from_id: 'm_rickard', to_id: 'm_lyarra', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_r_ned', tree_id: DEMO_TREE_ID, from_id: 'm_rickard', to_id: DEMO_OWNER_NODE_ID, type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_l_ned', tree_id: DEMO_TREE_ID, from_id: 'm_lyarra', to_id: DEMO_OWNER_NODE_ID, type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_r_lyanna', tree_id: DEMO_TREE_ID, from_id: 'm_rickard', to_id: 'm_lyanna', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_l_lyanna', tree_id: DEMO_TREE_ID, from_id: 'm_lyarra', to_id: 'm_lyanna', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_r_benjen', tree_id: DEMO_TREE_ID, from_id: 'm_rickard', to_id: 'm_benjen', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_l_benjen', tree_id: DEMO_TREE_ID, from_id: 'm_lyarra', to_id: 'm_benjen', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_ned_catelyn', tree_id: DEMO_TREE_ID, from_id: DEMO_OWNER_NODE_ID, to_id: 'm_catelyn', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_ned_robb', tree_id: DEMO_TREE_ID, from_id: DEMO_OWNER_NODE_ID, to_id: 'm_robb', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cat_robb', tree_id: DEMO_TREE_ID, from_id: 'm_catelyn', to_id: 'm_robb', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_ned_sansa', tree_id: DEMO_TREE_ID, from_id: DEMO_OWNER_NODE_ID, to_id: 'm_sansa', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cat_sansa', tree_id: DEMO_TREE_ID, from_id: 'm_catelyn', to_id: 'm_sansa', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_ned_arya', tree_id: DEMO_TREE_ID, from_id: DEMO_OWNER_NODE_ID, to_id: 'm_arya', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cat_arya', tree_id: DEMO_TREE_ID, from_id: 'm_catelyn', to_id: 'm_arya', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_ned_bran', tree_id: DEMO_TREE_ID, from_id: DEMO_OWNER_NODE_ID, to_id: 'm_bran', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cat_bran', tree_id: DEMO_TREE_ID, from_id: 'm_catelyn', to_id: 'm_bran', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_ned_rickon', tree_id: DEMO_TREE_ID, from_id: DEMO_OWNER_NODE_ID, to_id: 'm_rickon', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cat_rickon', tree_id: DEMO_TREE_ID, from_id: 'm_catelyn', to_id: 'm_rickon', type: 'parent_of', created_at: new Date().toISOString() },

  // --- HOUSE LANNISTER RELATIONSHIPS ---
  { id: 'r_tywin_joanna', tree_id: DEMO_TREE_ID, from_id: 'm_tywin', to_id: 'm_joanna', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_tywin_cersei', tree_id: DEMO_TREE_ID, from_id: 'm_tywin', to_id: 'm_cersei', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_joanna_cersei', tree_id: DEMO_TREE_ID, from_id: 'm_joanna', to_id: 'm_cersei', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_tywin_jaime', tree_id: DEMO_TREE_ID, from_id: 'm_tywin', to_id: 'm_jaime', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_joanna_jaime', tree_id: DEMO_TREE_ID, from_id: 'm_joanna', to_id: 'm_jaime', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_tywin_tyrion', tree_id: DEMO_TREE_ID, from_id: 'm_tywin', to_id: 'm_tyrion', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_joanna_tyrion', tree_id: DEMO_TREE_ID, from_id: 'm_joanna', to_id: 'm_tyrion', type: 'parent_of', created_at: new Date().toISOString() },

  // --- HOUSE BARATHEON / CERSEI / JAIME RELATIONSHIPS ---
  { id: 'r_robert_cersei', tree_id: DEMO_TREE_ID, from_id: 'm_robert', to_id: 'm_cersei', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_jaime_cersei', tree_id: DEMO_TREE_ID, from_id: 'm_jaime', to_id: 'm_cersei', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_cersei_joffrey', tree_id: DEMO_TREE_ID, from_id: 'm_cersei', to_id: 'm_joffrey', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_jaime_joffrey', tree_id: DEMO_TREE_ID, from_id: 'm_jaime', to_id: 'm_joffrey', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cersei_myrcella', tree_id: DEMO_TREE_ID, from_id: 'm_cersei', to_id: 'm_myrcella', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_jaime_myrcella', tree_id: DEMO_TREE_ID, from_id: 'm_jaime', to_id: 'm_myrcella', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_cersei_tommen', tree_id: DEMO_TREE_ID, from_id: 'm_cersei', to_id: 'm_tommen', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_jaime_tommen', tree_id: DEMO_TREE_ID, from_id: 'm_jaime', to_id: 'm_tommen', type: 'parent_of', created_at: new Date().toISOString() },

  // --- HOUSE TARGARYEN RELATIONSHIPS ---
  { id: 'r_aerys_rhaella', tree_id: DEMO_TREE_ID, from_id: 'm_aerys', to_id: 'm_rhaella', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_aerys_rhaegar', tree_id: DEMO_TREE_ID, from_id: 'm_aerys', to_id: 'm_rhaegar', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_rhaella_rhaegar', tree_id: DEMO_TREE_ID, from_id: 'm_rhaella', to_id: 'm_rhaegar', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_aerys_viserys', tree_id: DEMO_TREE_ID, from_id: 'm_aerys', to_id: 'm_viserys', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_rhaella_viserys', tree_id: DEMO_TREE_ID, from_id: 'm_rhaella', to_id: 'm_viserys', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_aerys_daenerys', tree_id: DEMO_TREE_ID, from_id: 'm_aerys', to_id: 'm_daenerys', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_rhaella_daenerys', tree_id: DEMO_TREE_ID, from_id: 'm_rhaella', to_id: 'm_daenerys', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_daenerys_khal', tree_id: DEMO_TREE_ID, from_id: 'm_daenerys', to_id: 'm_khal_drogo', type: 'spouse_of', created_at: new Date().toISOString() },

  // --- JON SNOW (TARGARYEN + STARK) ---
  { id: 'r_lyanna_jon', tree_id: DEMO_TREE_ID, from_id: 'm_lyanna', to_id: 'm_jon', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_rhaegar_jon', tree_id: DEMO_TREE_ID, from_id: 'm_rhaegar', to_id: 'm_jon', type: 'parent_of', created_at: new Date().toISOString() },
  { id: 'r_rhaegar_lyanna', tree_id: DEMO_TREE_ID, from_id: 'm_rhaegar', to_id: 'm_lyanna', type: 'spouse_of', created_at: new Date().toISOString() },

  // --- SANSA'S MARRIAGES ---
  { id: 'r_sansa_joffrey', tree_id: DEMO_TREE_ID, from_id: 'm_sansa', to_id: 'm_joffrey', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_sansa_tyrion', tree_id: DEMO_TREE_ID, from_id: 'm_sansa', to_id: 'm_tyrion', type: 'spouse_of', created_at: new Date().toISOString() },
  { id: 'r_sansa_ramsay', tree_id: DEMO_TREE_ID, from_id: 'm_sansa', to_id: 'm_ramsay', type: 'spouse_of', created_at: new Date().toISOString() },

  // --- BOLTON RELATIONSHIPS ---
  { id: 'r_roose_ramsay', tree_id: DEMO_TREE_ID, from_id: 'm_roose', to_id: 'm_ramsay', type: 'parent_of', created_at: new Date().toISOString() }
]
