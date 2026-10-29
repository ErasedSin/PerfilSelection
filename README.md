# PerfilSelection

Página de links em formato de rede: o dono do perfil fica no centro, e cada link aparece em um nó ao redor, ligado por linhas de circuito com pulsos de luz.

**Demo:** https://erasedsin.github.io/PerfilSelection/

## Recursos
- Linhas desenhadas em SVG, com animação de entrada e pulsos contínuos
- Passar o mouse ou focar com o teclado (Tab) acende a linha do link
- Grupos por cor: links com `"group": "pessoal"` ficam em rosa, os outros em azul
- Responsivo: o círculo se ajusta ao tamanho da tela
- Links reais, que abrem em nova aba e funcionam com teclado
- Respeita a preferência de movimento reduzido do sistema

## Tecnologias
HTML, CSS e JavaScript puro, sem bibliotecas nem build.

## Personalizar
Edite o `links.json`:
- `center`: `name` e `image` do nó central
- `items`: lista de links, cada um com `name`, `url`, `image` (opcional) e `group` (opcional)

Sem `image`, o site usa o ícone do próprio site do link ou as iniciais do nome.


