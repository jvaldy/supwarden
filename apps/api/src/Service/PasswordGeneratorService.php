<?php

declare(strict_types=1);

namespace App\Service;

final class PasswordGeneratorService
{
    private const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    private const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    private const DIGITS = '0123456789';
    private const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/|~';

    /**
     * @param array{length?:int,useLowercase?:bool,useUppercase?:bool,useDigits?:bool,useSymbols?:bool,exclude?:string} $options
     */
    public function generate(array $options = []): string
    {
        $length = (int) ($options['length'] ?? 20);
        $length = max(8, min(128, $length));

        $exclude = (string) ($options['exclude'] ?? '');

        $sets = [];

        if (($options['useLowercase'] ?? true) === true) {
            $sets[] = $this->filterSet(self::LOWER, $exclude);
        }

        if (($options['useUppercase'] ?? true) === true) {
            $sets[] = $this->filterSet(self::UPPER, $exclude);
        }

        if (($options['useDigits'] ?? true) === true) {
            $sets[] = $this->filterSet(self::DIGITS, $exclude);
        }

        if (($options['useSymbols'] ?? true) === true) {
            $sets[] = $this->filterSet(self::SYMBOLS, $exclude);
        }

        $sets = array_values(array_filter($sets, static fn (string $set): bool => $set !== ''));

        if ($sets === []) {
            throw new \InvalidArgumentException('Aucun jeu de caractères valide n\'est disponible avec ces règles.');
        }

        $requiredCharacters = [];

        foreach ($sets as $set) {
            $requiredCharacters[] = $set[random_int(0, strlen($set) - 1)];
        }

        $pool = implode('', $sets);
        $passwordCharacters = $requiredCharacters;

        for ($index = count($requiredCharacters); $index < $length; ++$index) {
            $passwordCharacters[] = $pool[random_int(0, strlen($pool) - 1)];
        }

        shuffle($passwordCharacters);

        return implode('', $passwordCharacters);
    }

    private function filterSet(string $set, string $exclude): string
    {
        if ($exclude === '') {
            return $set;
        }

        return str_replace(str_split($exclude), '', $set);
    }
}
