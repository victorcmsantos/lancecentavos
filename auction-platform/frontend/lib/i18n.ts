import { Auction } from '@/lib/types';

export function traduzirStatusLeilao(status: Auction['status']): string {
  switch (status) {
    case 'draft':
      return 'rascunho';
    case 'active':
      return 'ativo';
    case 'finished':
      return 'encerrado';
    default:
      return status;
  }
}

export function traduzirPerfil(role: string | undefined): string {
  switch (role) {
    case 'user':
      return 'usuario';
    case 'influencer':
      return 'influenciador';
    case 'admin':
      return 'admin';
    default:
      return role ?? '-';
  }
}
