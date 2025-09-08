export interface Team {
  id: number;
  name: string;
  logo: string;
  purse: number;
  remainingPurse: number;
  poc1: string;
  poc2: string;
}

export interface Player {
  id: number;
  name: string;
  skillId: number;
  skillName: string;  
  photo: string;
  basePrice: number;
  soldPrice: number | null;
  teamId: number | null;
  teamName?: string;
  status: 'SOLD' | 'UNSOLD';
  stats: Record<string, number>;
  isNewPlayer:number;

}
