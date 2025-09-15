// ARQUIVO: database.js (NOVO)

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Pega as credenciais do seu arquivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;