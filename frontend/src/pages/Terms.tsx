import LegalDocument from '../components/LegalDocument';
import termsOfService from '../../../docs/legal/terms-of-service.md?raw';

export default function Terms() {
  return <LegalDocument source={termsOfService} title="Terms of Service" />;
}
