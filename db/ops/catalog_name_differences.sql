-- Read-only comparison by legacy_id. Run with the catalog schema on search_path.
WITH csv_names(legacy_id, csv_name) AS (
  VALUES
    ('limpeza-manutencao', 'Manutenção'),
    ('limpeza-tecnica', 'Limpeza Técnica'),
    ('limpeza-premium', 'Limpeza Premium'),
    ('polimento-comercial', 'Polimento Comercial'),
    ('polimento-tecnico', 'Polimento Técnico'),
    ('revestimento-1-ano', 'Proteção 1 Ano'),
    ('revestimento-3-anos', 'Proteção 3 Anos'),
    ('undercar', 'Detalhamento Undercar'),
    ('undercar-premium', 'Detalhamento Undercar Premium'),
    ('limpeza-motor', 'Limpeza de Motor'),
    ('ppf-carro-frontal', 'PPF Frontal'),
    ('ppf-carro-full', 'PPF Full'),
    ('ppf-carro-hibrida', 'Proteção Híbrida'),
    ('ppf-carro-macanetas', 'Quinas e Conchas de Maçaneta'),
    ('ppf-carro-soleiras', 'Soleiras de Portas'),
    ('ppf-carro-farol', 'Farol'),
    ('ppf-carro-parachoque', 'Para-choque'),
    ('ppf-carro-capo', 'Capô'),
    ('ppf-carro-colunas', 'Colunas em Black Piano'),
    ('limpeza-moto-ouro', 'Limpeza Ouro'),
    ('limpeza-moto-premium', 'Limpeza Premium para Moto'),
    ('ppf-moto', 'PPF em Motos'),
    ('higienizacao-cintos', 'Higienização de cintos de segurança'),
    ('higienizacao-teto', 'Higienização de teto e coluna'),
    ('higienizacao-ar', 'Higienização do ar com ozônio e troca de filtro de ar'),
    ('higienizacao-carpete', 'Higienização de carpete e porta-malas completo'),
    ('higienizacao-bancos', 'Higienização de bancos e forros de porta'),
    ('higienizacao-completa', 'Higienização interna completa'),
    ('combo-carro-0km', 'Pacote Carro 0Km'),
    ('combo-preparacao-venda', 'Preparação para Venda'),
    ('cristalizacao-vidros', 'Cristalização de Vidros'),
    ('revestimento-ceramico', 'Revestimento Cerâmico'),
    ('ppf-carro', 'PPF em Carro')
), db_items AS (
  SELECT COALESCE(source_id, id::text) AS legacy_id, nome AS db_name
  FROM catalog_items
)
SELECT csv_names.legacy_id, db_items.db_name, csv_names.csv_name
FROM csv_names
LEFT JOIN db_items USING (legacy_id)
WHERE db_items.db_name IS NULL OR db_items.db_name IS DISTINCT FROM csv_names.csv_name
ORDER BY csv_names.legacy_id;
