import { apiRequest } from '../../lib/api/client';

export type PublicCardAuthorization = {
  state: 'active' | 'expired' | 'used' | 'revoked';
  expiresAt: string;
  termVersion: string;
  terms: {
    merchant: string;
    clientName: string;
    dueDay: number;
    services: Array<{
      projectName: string;
      name: string;
      amountCents: number;
      frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
      nextDueDate: string;
    }>;
    maxCycleAmountCents: number;
    variableRule: string;
    priceChangeRule: string;
    supportEmail: string;
    privacyPath: string;
  };
  tokenizationAvailable: boolean;
  environment: 'sandbox' | 'production';
};

export type CardAuthorizationInput = {
  verificationDocument: string;
  holderName: string;
  holderCpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  accepted: true;
  termVersion: string;
};

export const fetchPublicCardAuthorization = (token: string) =>
  apiRequest<PublicCardAuthorization>(`/card-authorizations/${encodeURIComponent(token)}`, { auth: false });

export const authorizePublicCard = (token: string, input: CardAuthorizationInput) =>
  apiRequest<{ authorized: true; authorizationId: string; card: { brand: string; lastFour: string } }>(
    `/card-authorizations/${encodeURIComponent(token)}/tokenize`,
    { method: 'POST', body: input, auth: false },
  );
