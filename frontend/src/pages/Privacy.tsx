import LegalDocument from '../components/LegalDocument';
import privacyPolicy from '../../../docs/legal/privacy-policy.md?raw';

export default function Privacy() {
  return <LegalDocument source={privacyPolicy} title="Privacy Policy" />;
}
