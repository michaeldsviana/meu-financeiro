# MEU FINANCEIRO — Dinâmicas de uso e cálculo

Como cada seção funciona, o que ela espera de você e como cada número é obtido.
Escrito a partir do código publicado, não de intenção.

---

## O modelo por trás de tudo

Antes das seções, três convenções que explicam quase todo o comportamento do sistema.

### 1. Existe um razão único

Toda movimentação vira uma linha em `transactions`, com **valor assinado**: entradas
positivas, saídas negativas. O campo `kind` diz o que a linha significa:

| kind | Significado | Efeito no caixa | Efeito no patrimônio |
| --- | --- | --- | --- |
| `income` | Receita | entra | aumenta |
| `expense` | Despesa (conta ou cartão) | sai (se for da conta) | diminui |
| `transfer` | Entre contas suas | sai de uma, entra na outra | neutro |
| `investment` | Aporte | sai do caixa | neutro — muda de bolso |
| `card_payment` | Pagamento de fatura | sai do caixa | neutro — abate a dívida |

Essa distinção é o que evita a contagem dupla. Um aporte **não** é despesa: seu
patrimônio não mudou, só saiu da conta corrente e entrou no investimento. Pagar a
fatura também não é despesa — a despesa já foi contada quando você usou o cartão.

### 2. Cada lançamento tem uma situação

`planned` (previsto) · `pending` (pendente) · `cleared` (liquidado) · `reconciled` (conciliado)

Só `cleared` e `reconciled` contam como dinheiro que já se moveu. Os demais alimentam
a previsão, não o realizado. É por isso que você pode lançar o aluguel de dezembro
hoje sem sujar o resultado de agosto.

### 3. Competência separada da data

Cada lançamento tem `tx_date` (quando aconteceu) e `competence_month` (a que mês
pertence). A compra parcelada de janeiro que cai na fatura de fevereiro fica no mês
que faz sentido para você, não no que o extrato impõe.

---

## Painel

**O que fazer aqui:** nada. É a tela de leitura. Se algo está errado nela, o conserto
é em outra seção.

### Patrimônio líquido

```
patrimônio = caixa + investimentos + imóveis − faturas de cartão − dívidas
```

- **caixa** = soma do saldo *informado* de cada conta (não do razão — veja Contas)
- **investimentos** = soma do valor atual dos produtos não arquivados
- **imóveis** = soma do valor de mercado dos imóveis não arquivados
- **faturas** = soma do saldo informado de cada cartão
- **dívidas** = soma do saldo devedor das dívidas ativas

O sistema também calcula o **patrimônio líquido**: `caixa + investimentos − cartões`.
É o que você teria se precisasse liquidar tudo amanhã sem vender imóvel.

### Régua de caixa

Doze colunas, uma por mês, mostrando o saldo projetado. As cores respondem a duas
perguntas:

- **Verde** — o saldo cobre o mês e ainda sobra acima da reserva necessária
- **Âmbar** — o saldo é positivo mas fica abaixo do que você precisa ter guardado
- **Vermelho** — o saldo fica negativo naquele mês

A linha tracejada âmbar marca a reserva necessária. A linha cinza marca o zero.
Tocar numa coluna abre o detalhe daquele mês.

### Guardar este mês

Soma de duas fontes:

**Obrigações não mensais dos imóveis** — para cada uma, divide o valor pelos meses
que faltam até o vencimento:

```
guardar por mês = valor ÷ (meses até o vencimento + 1)
```

O `+ 1` inclui o próprio mês do vencimento. IPTU de R$ 3.600 vencendo em 11 meses:
R$ 327,27 por mês.

**Aportes planejados dos objetivos** — entra o valor que você definiu como aporte
mensal em cada objetivo, direto.

A barra de reserva de emergência compara seu caixa atual com a meta definida em
Ajustes. A falta é `meta − caixa`, nunca negativa.

---

## Contas

**O que fazer aqui:** cadastrar cada conta com o saldo que aparece hoje no app do
banco. Depois, conciliar de vez em quando.

### Dois saldos, de propósito

O sistema mantém dois números para cada conta e mostra a diferença.

**Saldo informado** — o que você digitou. É a verdade oficial e o que entra no
patrimônio.

**Saldo do razão** — o que os lançamentos dizem:

```
razão = saldo inicial + todos os lançamentos liquidados da conta
```

Numa transferência, a conta de destino recebe o valor com sinal invertido — o mesmo
lançamento serve às duas pontas.

**Diferença** = informado − razão. Se for zero, seu registro está completo. Se não
for, faltou lançar alguma coisa (ou sobrou).

### Conciliação

Ao conciliar, você informa o saldo do extrato e escolhe:

- **Só atualizar** — grava o novo saldo informado e não mexe no razão. A diferença
  continua existindo.
- **Ajustar e conciliar** — grava o saldo *e* cria um lançamento de ajuste com a
  diferença exata, zerando o descompasso. Use quando não vale a pena caçar o que
  faltou.

---

## Cartões

**O que fazer aqui:** cadastrar limite, dia de fechamento e dia de vencimento.

### Dívida do cartão

```
dívida no razão = compras no cartão − pagamentos de fatura
```

Compras são lançamentos `expense` com `card_id`; pagamentos são `card_payment`.
Como nas contas, existe o saldo informado por você e a diferença entre os dois.

### Uso do limite

```
uso = saldo informado ÷ limite       (travado em 100%)
disponível = limite − saldo informado
```

### Ciclo da fatura

A fatura de um mês contém as compras entre dois fechamentos:

```
fatura de agosto = compras de (fechamento de julho, fechamento de agosto]
```

O fechamento de julho é aberto e o de agosto é fechado — uma compra feita
exatamente no dia do fechamento entra na fatura que fecha naquele dia.

O vencimento é calculado no mês seguinte quando o dia de vencimento é anterior ao
de fechamento. Fecha dia 25, vence dia 5: o vencimento cai no mês seguinte.

Dias que não existem no mês são ajustados para o último dia. Fechamento dia 31 em
fevereiro vira dia 28.

---

## Lançamentos

**O que fazer aqui:** consultar e corrigir. Lançar avulso pelo botão flutuante.

Os filtros combinam mês, conta, cartão, categoria, objetivo, tipo, situação e busca
por texto. Os quatro indicadores no topo respondem ao filtro ativo:

```
receitas  = soma dos income liquidados do mês
despesas  = soma dos expense liquidados do mês
aportes   = soma dos investment liquidados do mês
sobra     = receitas − despesas − aportes
```

Repare que **sobra** desconta os aportes e **resultado** não:

```
resultado = receitas − despesas          quanto você produziu
sobra     = resultado − aportes          quanto ficou na conta
```

Resultado positivo com sobra negativa significa que você investiu mais do que
sobrou — não é erro, mas puxa o caixa.

---

## Fluxo

**O que fazer aqui:** ler a previsão e entender de onde ela vem.

### Como a previsão é montada

Cada mês recebe um de três tratamentos:

**Realizado** (meses passados) — usa os números que aconteceram. Aportes entram como
saída porque saíram do caixa.

**Em curso** (mês atual) — soma o que já foi liquidado com os compromissos que ainda
vão vencer, aplicando um fator de 0,6 sobre eles se já houve despesa no mês. É um
amortecedor: parte dos compromissos do mês costuma já estar dentro das despesas
lançadas, e sem esse desconto o mês corrente apareceria pior do que é.

**Previsto** (meses futuros):

```
receita = lançamentos previstos do mês, ou a média dos últimos 3 meses
despesa = compromissos conhecidos + despesa variável estimada + previstos
saldo   = saldo anterior + receita − despesa
```

### A despesa variável estimada

O ponto mais delicado do cálculo:

```
variável = média de despesa dos últimos 3 meses − compromissos do mês atual
```

A subtração existe para não contar duas vezes. Sua média histórica de R$ 5.000 já
inclui o condomínio e a Netflix. Se o sistema somasse os compromissos por cima da
média, o condomínio entraria duas vezes. Nunca fica negativa.

A média usa apenas os meses com movimento, então um mês vazio não derruba a
estimativa.

### Patrimônio

A aba mostra a composição de hoje e a evolução ao longo do tempo. O gráfico de
evolução só existe se você salvar as fotografias mensais em Ajustes — o sistema
não reconstrói o passado sozinho, porque não tem como saber quanto o imóvel valia
em março.

---

## Investimentos

**O que fazer aqui:** criar objetivos, ligar produtos a eles, registrar aportes e
lançar os juros uma vez por mês.

### Taxas

Guardadas como fração: `0,0095` é 0,95%. Se a taxa for anual, o sistema converte
para mensal com juros compostos, não dividindo por 12:

```
taxa mensal = (1 + taxa anual)^(1/12) − 1
```

12% ao ano viram 0,949% ao mês, não 1%.

### Juros do mês

O botão *Lançar juros* aparece quando existem produtos sem juros registrados no mês
corrente. Para cada um:

```
juros = valor atual × taxa mensal
```

Ele grava a linha de juros e soma o valor ao produto. Só aparece uma vez por mês
por produto — se já lançou, o botão some.

Isso é deliberadamente manual. Rendimento real não é linear, e lançar sozinho todo
dia 1º criaria um número bonito e falso.

### Aportes

Registrar um aporte novo soma o valor ao produto automaticamente. O aporte herda o
objetivo do produto.

### Aporte necessário

Para cada objetivo com meta e prazo, o sistema calcula quanto falta poupar por mês,
considerando que o dinheiro já aplicado continua rendendo:

```
valor futuro do que já tenho = atual × (1 + taxa)^meses
falta                        = meta − valor futuro
aporte necessário            = falta × taxa ÷ ((1 + taxa)^meses − 1)
```

É a fórmula da série uniforme. Sem taxa, vira uma divisão simples. A taxa usada é a
**média ponderada** das taxas dos produtos ligados ao objetivo, pesada pelo valor de
cada um.

### Projeção

24 meses de juros compostos com os aportes planejados. Quando um objetivo tem vários
produtos, o aporte mensal é dividido igualmente entre eles.

---

## Imóveis

**O que fazer aqui:** cadastrar o imóvel, depois cada obrigação e cada dívida.

### Obrigações

Cada uma tem valor, frequência (mensal, trimestral, semestral, anual ou única) e
próximo vencimento. A partir daí o sistema projeta todas as incidências futuras.

O interruptor **Reservar por mês** é o que aciona o rateio no painel. Obrigações
mensais nunca são rateadas — já são mensais. Se você marcar *parcelas restantes*,
a obrigação some da previsão depois da última.

### Dívidas

Entram na previsão como parcela mensal, a partir do próximo vencimento e respeitando
o número de parcelas restantes. O saldo devedor entra no patrimônio como passivo.

O sistema **não amortiza** a dívida sozinho: o saldo devedor é o que você informar.
A taxa cadastrada serve para você comparar operações, não para recalcular o saldo.

---

## Assinaturas

**O que fazer aqui:** cadastrar tudo que se repete sozinho.

O custo mensal normaliza frequências diferentes:

```
custo mensal = valor × (cobranças por ano) ÷ 12
```

Uma anuidade de R$ 240 aparece como R$ 20 por mês. O total anual é o mensal × 12.

Assinaturas ativas entram automaticamente nos compromissos de cada mês futuro,
alimentando a previsão.

---

## Saúde e Custos de capital

**O que fazer aqui:** registrar por mês de competência e marcar como pago.

As duas telas são idênticas por dentro. A separação existe porque as perguntas são
diferentes: *quanto minha saúde custa por ano* e *quanto o crédito está me custando*.

Lançamentos **não pagos** do mês entram nos compromissos da previsão. Pagos saem —
o pressuposto é que já viraram despesa no razão.

Custos de capital aceitam uma taxa opcional, só para comparação entre operações.

---

## Importar extratos

**O que fazer aqui:** enviar CSV ou OFX, conferir e confirmar.

O arquivo é lido no seu navegador. Nada sai do aparelho até você tocar em importar.

### Leitura

**CSV** — detecta o separador sozinho, reconhece cabeçalhos em português (data,
descrição, valor, crédito, débito) e vários formatos de data. Aceita colunas
separadas de entrada e saída.

**OFX** — lê os blocos de transação do arquivo, incluindo o identificador único que
o banco fornece.

### Deduplicação

Cada linha ganha uma impressão digital:

```
com identificador do banco:  conta + identificador
sem identificador:           conta + data + valor + descrição + índice de repetição
```

O índice de repetição resolve o caso das compras idênticas no mesmo dia: dois cafés
de R$ 12 no mesmo lugar geram digitais diferentes, então os dois entram. Mas se você
importar o mesmo arquivo de novo, ambos são reconhecidos e vêm desmarcados.

### Categorização

Duas camadas, nesta ordem:

1. **Suas regras**, da menor prioridade numérica para a maior. A primeira que casar
   vence. Podem forçar o tipo e até renomear a descrição.
2. **Lista embutida** de mais de 60 padrões do mercado brasileiro — concessionárias,
   supermercados, farmácias, streaming, transporte, impostos.

Sem correspondência, o tipo vem do sinal: negativo é despesa, positivo é receita.

O botão *criar regra* extrai as duas palavras mais significativas da descrição,
descartando ruído como PIX, COMPRA e TED. Ao salvar, a regra é aplicada
imediatamente às linhas ainda na tela.

Tudo que é importado entra como **liquidado**.

---

## Ajustes

**O que fazer aqui:** definir a meta de reserva, o horizonte da previsão e salvar a
fotografia mensal.

**Meta de reserva de emergência** — alimenta a barra de progresso do painel e a
linha âmbar da régua de caixa.

**Meses de projeção** — de 6 a 36. Quanto mais longe, mais a previsão depende da
média histórica e menos dos seus lançamentos.

**Fotografia do patrimônio** — grava caixa, investimentos, imóveis, cartões, dívidas
e o líquido daquele mês. É o que constrói o gráfico de evolução. Salvar de novo no
mesmo mês sobrescreve.

**Categorias** — as 29 padrão são criadas no primeiro acesso. Arquivar preserva o
histórico; excluir só funciona se nada estiver ligado a ela.

---

## A rotina que faz o sistema funcionar

**Toda semana**, se der: importe os extratos. É o que mantém o razão perto da
realidade.

**Todo mês**, uns dez minutos:

1. Atualize o saldo informado de cada conta e concilie o que estiver torto
2. Atualize o saldo dos cartões
3. Toque em *Lançar juros* nos investimentos
4. Salve a fotografia do patrimônio em Ajustes

**A cada seis meses:** revise o valor de mercado dos imóveis e o saldo devedor dos
financiamentos. São os números que mais envelhecem calados.

---

## Onde a previsão erra, e por quê

Vale saber para não confiar demais.

**Nos três primeiros meses de uso** a estimativa de despesa variável é fraca, porque
não há histórico. Ela melhora sozinha conforme você importa extratos.

**Receitas irregulares** — a média de três meses trata bem salário fixo e mal renda
variável. Se sua renda oscila, lance as receitas previstas manualmente; o sistema
prefere o que você lançou à média.

**O mês corrente é aproximado.** O fator de 0,6 sobre os compromissos restantes é um
amortecedor razoável, não uma verdade. O número do mês corrente é o menos confiável
da régua.

**Imóveis não são caixa.** O patrimônio total inclui o valor dos imóveis, mas você
não paga o supermercado com eles. Para decisões de curto prazo, olhe o patrimônio
líquido — caixa mais investimentos menos cartões.
