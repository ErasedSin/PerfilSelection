# PerfilSelection

Página de links em formato de rede: a pessoa fica no centro, e cada rede social aparece em um nó ao redor, ligado por linhas de circuito animadas.

**Demo:** https://erasedsin.github.io/PerfilSelection/

## Como usar
1. Abra a página e clique em **Editar**.
2. Escreva o nome e cole o link de cada perfil (ou escolha a rede e digite o usuário).
3. Clique em **Aplicar**. As fotos vêm automaticamente das redes.
4. Clique em **Copiar link para compartilhar** e use esse endereço no currículo, na bio ou em um QR code.

Não precisa editar nenhum arquivo nem subir imagens.

## Como os dados são guardados
Não há servidor. Os links ficam no próprio endereço (depois do `#`) e no navegador de quem editou. Quem abre o link compartilhado vê a página montada.

## De onde vêm as fotos
- GitHub: direto de `github.com/usuario.png`.
- Instagram, TikTok, X, LinkedIn, YouTube e Twitch: pelo serviço [unavatar.io](https://unavatar.io), gratuito (limite de 50 pedidos por dia por IP). Redes que bloqueiam acesso automático podem falhar; nesse caso a página usa o ícone da rede, e por último as iniciais.
- Sites e portfólio: ícone do site.

As imagens são pedidas a esses serviços externos pelo navegador do visitante.

## Recursos
- Animações: linhas desenhadas em SVG com pulsos, órbita lenta, parallax com o mouse e partículas ao fundo
- Cores por grupo: redes sociais em rosa, perfil profissional em azul
- Responsivo, navegável por teclado, respeita a preferência de movimento reduzido
- Links validados: só http(s) e usuários simples são aceitos

## Tecnologias
HTML, CSS e JavaScript puro, sem build.

## Rodar localmente
```bash
python -m http.server 8000
```

## Publicar
No repositório: **Settings > Pages > Deploy from a branch > main / root**.
