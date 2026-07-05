import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Size Guide | Sri Boutique',
  description: 'Find your perfect fit with our size guide for sarees, blouses, kurtis, and lehengas.',
};

const blouseSizes = [
  { size: 'S', bust: '32"', waist: '28"' },
  { size: 'M', bust: '34"', waist: '30"' },
  { size: 'L', bust: '36"', waist: '32"' },
  { size: 'XL', bust: '38"', waist: '34"' },
  { size: 'XXL', bust: '40"', waist: '36"' },
];

const kurtiSizes = [
  { size: 'S', bust: '36"', length: '42"' },
  { size: 'M', bust: '38"', length: '43"' },
  { size: 'L', bust: '40"', length: '44"' },
  { size: 'XL', bust: '42"', length: '45"' },
];

export default function SizeGuidePage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-4">Size Guide</h1>
        <p className="text-muted-foreground mb-10">
          Most of our sarees are Free Size and designed to fit a range of body
          types with adjustable draping. For blouses and stitched garments,
          use the charts below to find your best fit.
        </p>

        <section className="mb-12">
          <h2 className="font-display text-xl font-medium mb-4">Blouse Sizes</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Bust</TableHead>
                <TableHead>Waist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blouseSizes.map((row) => (
                <TableRow key={row.size}>
                  <TableCell className="font-medium">{row.size}</TableCell>
                  <TableCell>{row.bust}</TableCell>
                  <TableCell>{row.waist}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-medium mb-4">Kurti Sizes</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Bust</TableHead>
                <TableHead>Length</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kurtiSizes.map((row) => (
                <TableRow key={row.size}>
                  <TableCell className="font-medium">{row.size}</TableCell>
                  <TableCell>{row.bust}</TableCell>
                  <TableCell>{row.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section>
          <h2 className="font-display text-xl font-medium mb-3">How to Measure</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Bust:</strong> Measure around the fullest part of your chest.</li>
            <li><strong>Waist:</strong> Measure around your natural waistline.</li>
            <li><strong>Length:</strong> Measure from shoulder to your desired hemline.</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Still unsure? Message us on{' '}
            <a
              href="https://instagram.com/sriboutiquestore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Instagram
            </a>{' '}
            or email{' '}
            <a href="mailto:sriboutiquestore@gmail.com" className="text-primary hover:underline">
              sriboutiquestore@gmail.com
            </a>{' '}
            with your measurements and we&apos;ll help you pick the right size.
          </p>
        </section>
      </div>
    </MainLayout>
  );
}