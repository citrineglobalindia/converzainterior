import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Contact, Loader2, MapPin, Phone, Plus, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';

interface SalesPerson {
  id: string;
  name: string;
  contact_number: string | null;
  location: string | null;
  created_at: string;
}

export default function Sales() {
  const { user, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState('');

  const fetchSalesPersons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales_persons')
      .select('id, name, contact_number, location, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error loading sales persons', description: error.message, variant: 'destructive' });
    } else {
      setSalesPersons(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('sales_persons').insert({
      name: name.trim(),
      contact_number: contactNumber.trim() || null,
      location: location.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast({ title: 'Error adding sales person', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sales person added', description: `${name.trim()} has been added.` });
      setName('');
      setContactNumber('');
      setLocation('');
      fetchSalesPersons();
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Contact className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground">Add and manage your sales persons</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Sales Person
          </CardTitle>
          <CardDescription>Enter the details of a new sales person.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Sales Person Name *</Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input id="contact" placeholder="+91 98765 43210" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Mumbai" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Sales Person
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sales Persons ({salesPersons.length})
          </CardTitle>
          <CardDescription>All sales persons added so far.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : salesPersons.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No sales persons added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Added On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPersons.map((sp) => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">{sp.name}</TableCell>
                    <TableCell>
                      {sp.contact_number ? (
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{sp.contact_number}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sp.location ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{sp.location}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(sp.created_at), 'dd MMM yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
