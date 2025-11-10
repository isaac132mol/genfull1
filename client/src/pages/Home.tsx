import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CreditCard, Star, ArrowUpDown, Trash2, Heart, Moon, CloudRain, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import ParticlesBackground from "@/components/ParticlesBackground";
import RainBackground from "@/components/RainBackground";

type Theme = 'dark' | 'rain';
type SortOption = 'date-desc' | 'date-asc' | 'bin-asc' | 'bin-desc' | 'quantity-desc';

interface HistoryEntry {
  id: number;
  bin: string;
  month: string;
  year: string;
  cvv: string;
  quantity: number;
  isFavorite: boolean | number;
  createdAt: Date | string;
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState('generator');
  
  // Generator states
  const [bin, setBin] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [results, setResults] = useState('');

  // Similarity states
  const [card1, setCard1] = useState('');
  const [card2, setCard2] = useState('');
  const [similarityResult, setSimilarityResult] = useState('');

  // Extrapolation states
  const [extrapolationCard, setExtrapolationCard] = useState('');
  const [extrapolationResults, setExtrapolationResults] = useState('');

  // History states
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  // tRPC queries
  const { data: history = [], refetch: refetchHistory } = trpc.cardHistory.list.useQuery();
  const addHistoryMutation = trpc.cardHistory.create.useMutation();
  const toggleFavoriteMutation = trpc.cardHistory.toggleFavorite.useMutation();
  const deleteHistoryMutation = trpc.cardHistory.delete.useMutation();
  const clearHistoryMutation = trpc.cardHistory.clear.useMutation();

  // Sorted and filtered history
  const sortedHistory = [...history].sort((a, b) => {
    switch (sortOption) {
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'bin-asc':
        return a.bin.localeCompare(b.bin);
      case 'bin-desc':
        return b.bin.localeCompare(a.bin);
      case 'quantity-desc':
        return b.quantity - a.quantity;
      default:
        return 0;
    }
  });

  const favoriteHistory = sortedHistory.filter(entry => entry.isFavorite);

  // Luhn algorithm for card validation
  const luhnCheck = (cardNumber: string): boolean => {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const generateCheckDigit = (partialCard: string): string => {
    for (let i = 0; i <= 9; i++) {
      const testCard = partialCard + i;
      if (luhnCheck(testCard)) {
        return i.toString();
      }
    }
    return '0';
  };

  const getCardBrand = (bin: string): string => {
    if (!bin) return '';
    const firstDigit = bin[0];
    const firstTwoDigits = bin.substring(0, 2);

    if (firstDigit === '4') return 'Visa';
    if (['51', '52', '53', '54', '55'].includes(firstTwoDigits)) return 'Mastercard';
    if (['34', '37'].includes(firstTwoDigits)) return 'American Express';
    if (firstTwoDigits === '60') return 'Discover';
    return 'Desconocida';
  };

  const handleGenerate = async () => {
    if (!bin || bin.length < 6) {
      toast.error('Por favor ingresa un BIN válido (mínimo 6 dígitos)');
      return;
    }

    if (!month || !year) {
      toast.error('Por favor ingresa mes y año');
      return;
    }

    const generatedCards: string[] = [];
    const binBase = bin.replace(/x/gi, '');

    for (let i = 0; i < quantity; i++) {
      let cardNumber = binBase;

      while (cardNumber.length < 15) {
        cardNumber += Math.floor(Math.random() * 10);
      }

      const checkDigit = generateCheckDigit(cardNumber);
      cardNumber += checkDigit;

      const cvvValue = cvv || Math.floor(100 + Math.random() * 900).toString();
      const formattedCard = `${cardNumber}|${month.padStart(2, '0')}|${year}|${cvvValue}`;
      generatedCards.push(formattedCard);
    }

    setResults(generatedCards.join('\n'));
    toast.success(`${quantity} tarjetas generadas exitosamente`);

    // Save to history
    try {
      await addHistoryMutation.mutateAsync({
        bin,
        month,
        year,
        cvv: cvv || '',
        quantity
      });
      refetchHistory();
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const handleSimilarity = () => {
    if (!card1 || !card2) {
      toast.error('Por favor ingresa ambas tarjetas');
      return;
    }

    const extractPattern = (card: string): string => {
      const parts = card.split('|');
      if (parts.length !== 4) return card;
      
      const [number, month, year, cvv] = parts;
      let pattern = '';

      for (let i = 0; i < Math.min(number.length, 16); i++) {
        if (i < 6 || i >= 12) {
          pattern += number[i];
        } else {
          pattern += 'x';
        }
      }

      return `${pattern}|${month}|${year}|${cvv}`;
    };

    const pattern = extractPattern(card1);
    setSimilarityResult(pattern);
    toast.success('Patrón de similitud calculado');
  };

  const handleExtrapolation = () => {
    if (!extrapolationCard) {
      toast.error('Por favor ingresa una tarjeta completa');
      return;
    }

    const parts = extrapolationCard.split('|');
    if (parts.length !== 4) {
      toast.error('Formato inválido. Usa: número|mes|año|cvv');
      return;
    }

    const [number, month, year, cvv] = parts;
    const patterns: string[] = [];

    // Generate 10 possible patterns
    for (let i = 0; i < 10; i++) {
      let newNumber = '';
      for (let j = 0; j < number.length; j++) {
        if (j >= 6 && j < 12) {
          newNumber += Math.floor(Math.random() * 10);
        } else {
          newNumber += number[j];
        }
      }

      // Recalculate check digit
      const checkDigit = generateCheckDigit(newNumber.substring(0, 15));
      newNumber = newNumber.substring(0, 15) + checkDigit;

      patterns.push(`${newNumber}|${month}|${year}|${cvv}`);
    }

    setExtrapolationResults(patterns.join('\n'));
    toast.success('Patrones generados exitosamente');
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setBin(entry.bin);
    setMonth(entry.month);
    setYear(entry.year);
    setCvv(entry.cvv);
    setQuantity(entry.quantity);
    setActiveTab('generator');
    toast.success('Datos cargados desde el historial');
  };

  const toggleFavorite = async (id: number) => {
    try {
      await toggleFavoriteMutation.mutateAsync({ id });
      refetchHistory();
    } catch (error) {
      toast.error('Error al actualizar favorito');
    }
  };

  const deleteHistoryEntry = async (id: number) => {
    try {
      await deleteHistoryMutation.mutateAsync({ id });
      refetchHistory();
      toast.success('Entrada eliminada');
    } catch (error) {
      toast.error('Error al eliminar entrada');
    }
  };

  const clearHistory = async () => {
    try {
      await clearHistoryMutation.mutateAsync();
      refetchHistory();
      toast.success('Historial limpiado');
    } catch (error) {
      toast.error('Error al limpiar historial');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {theme === 'rain' ? <RainBackground /> : <ParticlesBackground />}
      
      {/* Background gradient */}
      <div 
        className={`fixed inset-0 -z-10 transition-colors duration-700 ${
          theme === 'rain'
            ? 'bg-gradient-to-br from-cyan-950 via-blue-950 to-indigo-950'
            : 'bg-gradient-to-br from-purple-950 via-fuchsia-950 to-indigo-950'
        }`} 
      />
      
      <div className="container py-2 sm:py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 mb-3 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold animate-float text-white">
              Generador de Tarjetas
            </h1>
          </div>
          
          {/* Theme Switcher */}
          <div className="flex gap-2">
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="glass-button"
              title="Tema Espacio"
            >
              <Moon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Espacio</span>
            </Button>
            <Button
              variant={theme === 'rain' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('rain')}
              className="glass-button"
              title="Tema Lluvia"
            >
              <CloudRain className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Lluvia</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
          {/* Left Panel - Methods and History */}
          <div className="space-y-3 lg:space-y-6">
            <Tabs defaultValue="generator" className="w-full" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="glass-card border-white/20 w-full grid grid-cols-3 text-[10px] sm:text-sm h-8 sm:h-10">
                <TabsTrigger value="generator" className="data-[state=active]:glass-button flex items-center justify-center gap-1 sm:gap-2">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                  Generador
                </TabsTrigger>
                <TabsTrigger value="similarity" className="data-[state=active]:glass-button flex items-center justify-center gap-1 sm:gap-2">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  Similitud
                </TabsTrigger>
                <TabsTrigger value="extrapolation" className="data-[state=active]:glass-button flex items-center justify-center gap-1 sm:gap-2">
                  <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  Extrapolación
                </TabsTrigger>
              </TabsList>

              {/* Generator Tab - Empty, only history below */}
              <TabsContent value="generator" className="space-y-0">
                {/* Vacío - solo historial abajo */}
              </TabsContent>

              {/* Similarity Tab */}
              <TabsContent value="similarity" className="space-y-3 lg:space-y-6">
                <Card className="glass-card border-white/20">
                  <CardContent className="space-y-2 sm:space-y-4 pt-3 sm:pt-6 p-3 sm:p-6">
                    <div>
                      <Label htmlFor="card1" className="text-white">Tarjeta 1</Label>
                      <Input
                        id="card1"
                        value={card1}
                        onChange={(e) => setCard1(e.target.value)}
                        placeholder="4915110191768499"
                        className="glass-input text-white placeholder:text-white/50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="card2" className="text-white">Tarjeta 2</Label>
                      <Input
                        id="card2"
                        value={card2}
                        onChange={(e) => setCard2(e.target.value)}
                        placeholder="4915110176928790"
                        className="glass-input text-white placeholder:text-white/50"
                      />
                    </div>

                    <Button onClick={handleSimilarity} className="w-full glass-button">
                      Calcular Similitud
                    </Button>

                    <div>
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <Label className="text-white">Resultado</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(similarityResult)}
                          disabled={!similarityResult}
                          className="glass-button"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={similarityResult}
                        readOnly
                        className="glass-input text-white font-mono"
                        placeholder="El patrón aparecerá aquí..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Extrapolation Tab */}
              <TabsContent value="extrapolation" className="space-y-3 lg:space-y-6">
                <Card className="glass-card border-white/20">
                  <CardContent className="space-y-2 sm:space-y-4 pt-3 sm:pt-6 p-3 sm:p-6">
                    <div>
                      <Label htmlFor="extrapolation-card" className="text-white">Tarjeta Completa</Label>
                      <Input
                        id="extrapolation-card"
                        value={extrapolationCard}
                        onChange={(e) => setExtrapolationCard(e.target.value)}
                        placeholder="4833160095772767|04|20|858"
                        className="glass-input text-white placeholder:text-white/50"
                      />
                    </div>

                    <Button onClick={handleExtrapolation} className="w-full glass-button h-9 sm:h-10 text-sm">
                      Generar Patrones
                    </Button>

                    <div>
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <Label className="text-white text-xs sm:text-sm">Resultados</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(extrapolationResults)}
                          disabled={!extrapolationResults}
                          className="glass-button"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={extrapolationResults}
                        readOnly
                        rows={10}
                        className="glass-input text-white font-mono text-xs sm:text-sm"
                        placeholder="Los patrones aparecerán aquí..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* History Panel - Below methods */}
            <Card className="glass-card border-white/20">
              <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                <div className="flex justify-between items-center mb-1">
                  <CardTitle className="text-xs sm:text-sm text-white flex items-center gap-1">
                    <HistoryIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    Historial
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearHistory}
                    className="glass-button h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-1">
                  <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <SelectTrigger className="glass-input text-white text-xs h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Fecha (más reciente)</SelectItem>
                      <SelectItem value="date-asc">Fecha (más antigua)</SelectItem>
                      <SelectItem value="bin-asc">BIN (A-Z)</SelectItem>
                      <SelectItem value="bin-desc">BIN (Z-A)</SelectItem>
                      <SelectItem value="quantity-desc">Cantidad (mayor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 pt-1 sm:pt-2">
                {/* Favorites Section */}
                {favoriteHistory.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-xs sm:text-sm text-white font-semibold mb-1 flex items-center gap-1">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                      Favoritos
                    </h3>
                    <div className="space-y-1 max-h-24 sm:max-h-32 overflow-y-auto">
                      {favoriteHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="glass-input p-1.5 sm:p-2 rounded cursor-pointer hover:bg-white/10 transition-all"
                          onClick={() => loadFromHistory(entry)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-mono text-xs truncate">{entry.bin}</p>
                              <p className="text-white/60 text-[10px]">
                                {entry.quantity} tarjetas • {new Date(entry.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-0.5 ml-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(entry.id);
                                }}
                                className="h-5 w-5 p-0"
                              >
                                <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteHistoryEntry(entry.id);
                                }}
                                className="h-5 w-5 p-0"
                              >
                                <Trash2 className="h-2.5 w-2.5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All History */}
                <h3 className="text-xs sm:text-sm text-white font-semibold mb-1">Todas las búsquedas</h3>
                <div className="space-y-1 max-h-48 sm:max-h-64 overflow-y-auto">
                  {sortedHistory.length === 0 ? (
                    <p className="text-white/50 text-sm text-center py-4">
                      No hay búsquedas recientes
                    </p>
                  ) : (
                    sortedHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="glass-input p-1.5 sm:p-2 rounded cursor-pointer hover:bg-white/10 transition-all"
                        onClick={() => loadFromHistory(entry)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-mono text-xs truncate">{entry.bin}</p>
                            <p className="text-white/60 text-[10px]">
                              {entry.quantity} tarjetas • {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-0.5 ml-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(entry.id);
                              }}
                              className="h-5 w-5 p-0"
                            >
                              <Star className={`h-2.5 w-2.5 ${entry.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-white/50'}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteHistoryEntry(entry.id);
                              }}
                              className="h-5 w-5 p-0"
                            >
                              <Trash2 className="h-2.5 w-2.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Generator (always visible) */}
          <div>
            <Card className="glass-card border-white/20 lg:sticky lg:top-4">
              <CardHeader className="pb-2 sm:pb-4 p-3 sm:p-6">
                <CardTitle className="text-sm sm:text-lg text-white flex items-center gap-1 sm:gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  Generador de Tarjetas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-4 p-3 sm:p-6 pt-0">
                <div>
                  <Label htmlFor="bin-right" className="text-white">BIN</Label>
                  <Input
                    id="bin-right"
                    value={bin}
                    onChange={(e) => setBin(e.target.value)}
                    placeholder="456331004806xxxx"
                    maxLength={16}
                    className="glass-input text-white placeholder:text-white/50"
                  />
                  {bin && <p className="text-sm text-white/70 mt-1">Marca: {getCardBrand(bin)}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="month-right" className="text-white">Mes</Label>
                    <Input
                      id="month-right"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="MM"
                      maxLength={2}
                      className="glass-input text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year-right" className="text-white">Año</Label>
                    <Input
                      id="year-right"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="YYYY"
                      maxLength={4}
                      className="glass-input text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="cvv-right" className="text-white">CVV (Opcional)</Label>
                    <Input
                      id="cvv-right"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      maxLength={3}
                      className="glass-input text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity-right" className="text-white">Cantidad</Label>
                    <Input
                      id="quantity-right"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      min={1}
                      max={100}
                      className="glass-input text-white"
                    />
                  </div>
                </div>

                <Button onClick={handleGenerate} className="w-full glass-button h-9 sm:h-10 text-sm">
                  Generar Tarjetas
                </Button>

                <div>
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    <Label className="text-white text-xs sm:text-sm">Resultados</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(results)}
                      disabled={!results}
                      className="glass-button"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={results}
                    readOnly
                    rows={16}
                    className="glass-input text-white font-mono text-xs sm:text-sm"
                    placeholder="Tus resultados aparecerán aquí..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
