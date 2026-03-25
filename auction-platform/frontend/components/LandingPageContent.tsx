'use client';

import { alpha, Box, Button, Card, CardActionArea, CardContent, Divider, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { Tenant } from '@/lib/types';

export function LandingPageContent({
  resolvedInfluencers,
  isDedicatedTenantView,
  heroTitle,
  heroDescription
}: {
  resolvedInfluencers: Tenant[];
  isDedicatedTenantView: boolean;
  heroTitle: string;
  heroDescription: string;
}) {
  const featuredInfluencer = resolvedInfluencers[0] ?? null;
  const remainingInfluencers = featuredInfluencers(resolvedInfluencers);

  return (
    <Stack spacing={5}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.5fr) minmax(320px, 0.5fr)' },
          alignItems: 'start'
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.32em', fontWeight: 700 }}>
            {isDedicatedTenantView ? 'Canal exclusivo' : 'Marketplace editorial'}
          </Typography>
          <Typography variant="h1" sx={{ mt: 2, fontSize: { xs: '3.1rem', md: '4.8rem', xl: '6rem' }, lineHeight: 0.96, maxWidth: 980 }}>
            {heroTitle}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 3, maxWidth: 760, fontWeight: 400, lineHeight: 1.7 }}>
            {heroDescription}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
            <Button href="#influencers" variant="contained" size="large">
              Explorar vitrines
            </Button>
            <Button component={Link} href="/login" variant="outlined" size="large" color="inherit">
              Entrar para dar lances
            </Button>
          </Stack>
        </Box>

        <Card sx={{ bgcolor: (theme) => alpha(theme.palette.background.paper, 0.72) }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
              Leitura rapida
            </Typography>
            <Stack spacing={2.5} sx={{ mt: 2.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                  Canais abertos
                </Typography>
                <Typography variant="h3" sx={{ mt: 0.5 }}>{resolvedInfluencers.length}</Typography>
              </Box>
              <Divider flexItem />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                  Jornada
                </Typography>
                <Typography sx={{ mt: 1 }}>Escolha a vitrine, entre na sala e recarregue saldo sem trocar de contexto.</Typography>
              </Box>
              <Divider flexItem />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                  Curadoria
                </Typography>
                <Typography sx={{ mt: 1 }}>A vitrine principal fica em destaque e o restante aparece como grade de apoio.</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'divider',
          py: 2.5
        }}
      >
        {[
          ['01', 'Escolha uma vitrine', 'Cada canal organiza melhor o caminho ate o produto certo.'],
          ['02', 'Entre pela leitura do ritmo', 'Status, hora e atividade recente ajudam a decidir mais rapido.'],
          ['03', 'Participe sem sair do fluxo', 'Saldo e compra de pacotes continuam acessiveis durante a navegacao.']
        ].map(([index, title, text]) => (
          <Box key={index}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.24em', fontWeight: 700 }}>
              {index}
            </Typography>
            <Typography variant="h5" sx={{ mt: 1.25 }}>{title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: 360 }}>{text}</Typography>
          </Box>
        ))}
      </Box>

      <Stack spacing={2.5} id="influencers">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
              Escolha sua sala
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              Vitrines disponiveis
            </Typography>
          </Box>
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            O primeiro canal ganha tratamento de destaque. Os demais entram como lista visual para acelerar a escolha.
          </Typography>
        </Stack>

        {!resolvedInfluencers.length ? (
          <Card>
            <CardContent sx={{ py: 8 }}>
              <Typography align="center" color="text.secondary">
                Nenhum influenciador cadastrado ainda.
              </Typography>
            </CardContent>
          </Card>
        ) : null}

        {featuredInfluencer ? (
          <Card>
            <CardActionArea component={Link} href={`/influencer/${featuredInfluencer.subdomain}`}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.25fr) minmax(300px, 0.75fr)' } }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
                      Canal em destaque
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                      <Box sx={{ width: 74, height: 74, borderRadius: 2.5, overflow: 'hidden', bgcolor: featuredInfluencer.primary_color || 'primary.main', flexShrink: 0 }}>
                        {featuredInfluencer.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={featuredInfluencer.logo_url} alt={featuredInfluencer.display_name} className="h-full w-full object-cover" />
                        ) : null}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h3">{featuredInfluencer.display_name}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          @{featuredInfluencer.subdomain}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 3, maxWidth: 660, lineHeight: 1.7 }}>
                      Entre direto na vitrine principal para ver produtos, status e ritmo da disputa com menos ruído visual.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: '1fr' },
                      borderLeft: { xl: 1 },
                      borderTop: { xs: 1, xl: 0 },
                      borderColor: 'divider',
                      pl: { xl: 3 },
                      pt: { xs: 2.5, xl: 0 }
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                        Experiencia
                      </Typography>
                      <Typography sx={{ mt: 1 }}>Vitrine organizada com leitura mais rapida do contexto.</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                        Acesso
                      </Typography>
                      <Typography sx={{ mt: 1 }}>Entrada direta na sala do leilao e no fluxo de compra de lances.</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ) : null}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}>
          {remainingInfluencers.map((influencer) => (
            <Card key={influencer.id}>
              <CardActionArea component={Link} href={`/influencer/${influencer.subdomain}`}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1.75} alignItems="center">
                      <Box sx={{ width: 58, height: 58, borderRadius: 2, overflow: 'hidden', bgcolor: influencer.primary_color || 'primary.main', flexShrink: 0 }}>
                        {influencer.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={influencer.logo_url} alt={influencer.display_name} className="h-full w-full object-cover" />
                        ) : null}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h5" noWrap>{influencer.display_name}</Typography>
                        <Typography color="text.secondary">@{influencer.subdomain}</Typography>
                      </Box>
                    </Stack>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      Abra essa vitrine para consultar o produto, a atividade recente e seguir para a sala ao vivo.
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Stack>
    </Stack>
  );
}

function featuredInfluencers(influencers: Tenant[]) {
  return influencers.slice(1);
}
